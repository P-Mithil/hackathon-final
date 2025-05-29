
'use server';
/**
 * @fileOverview Weather data fetching flow and tool using tomorrow.io API.
 *
 * - getWeather - A function that fetches current weather and 7-day forecast.
 * - GetWeatherInput - The input type for the getWeather function.c
 * - WeatherAndForecastOutput - The return type for the getWeather function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, addDays, startOfDay } from 'date-fns';

// Define the schema for the input (e.g., location)
const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('Latitude of the location.'),
  longitude: z.number().describe('Longitude of the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

// Schema for current weather data
const CurrentWeatherDataSchema = z.object({
  temperature: z.number().describe('Current temperature in Celsius.'),
  humidity: z.number().describe('Current humidity percentage.'),
  windSpeed: z.number().describe('Current wind speed in km/h.'),
  weatherCode: z.number().describe('Weather condition code from tomorrow.io.'),
  precipitationProbability: z.number().describe('Probability of precipitation in percentage.'),
  uvIndex: z.number().describe('UV index.'),
  pressure: z.number().describe('Air pressure in hPa.'),
  weatherDescription: z.string().describe('A textual description of the weather.'),
});
export type CurrentWeatherData = z.infer<typeof CurrentWeatherDataSchema>;

// Schema for a single day in the forecast
const DailyForecastItemSchema = z.object({
  date: z.string().describe('Date of the forecast (e.g., "YYYY-MM-DD").'),
  tempMax: z.number().describe('Maximum temperature for the day in Celsius.'),
  tempMin: z.number().describe('Minimum temperature for the day in Celsius.'),
  weatherCode: z.number().describe('Weather condition code for the day.'),
  weatherDescription: z.string().describe('Textual description of the weather for the day.'),
  precipitationProbability: z.number().describe('Average probability of precipitation for the day.'),
});
export type DailyForecastItem = z.infer<typeof DailyForecastItemSchema>;

// Schema for the combined output
const WeatherAndForecastOutputSchema = z.object({
  current: CurrentWeatherDataSchema.describe('Current weather conditions.'),
  forecast: z.array(DailyForecastItemSchema).length(7).describe('A 7-day weather forecast.'),
});
export type WeatherAndForecastOutput = z.infer<typeof WeatherAndForecastOutputSchema>;


const weatherCodeToString = (code: number | undefined, isDay: boolean = true): string => {
  if (code === undefined) return "Weather data unavailable";
  // tomorrow.io provides weather codes for day and night.
  // For simplicity, we'll use a single mapping, but this could be expanded.
  // Codes from: https://docs.tomorrow.io/reference/data-layers-weather-codes
  const codes: Record<number, string> = {
    0: "Unknown",
    1000: "Clear", // Clear, Sunny
    1001: "Cloudy",
    1100: "Mostly Clear",
    1101: "Partly Cloudy",
    1102: "Mostly Cloudy",
    2000: "Fog",
    2100: "Light Fog",
    4000: "Drizzle",
    4001: "Rain",
    4200: "Light Rain",
    4201: "Heavy Rain",
    5000: "Snow",
    5001: "Flurries",
    5100: "Light Snow",
    5101: "Heavy Snow",
    6000: "Freezing Drizzle",
    6001: "Freezing Rain",
    6200: "Light Freezing Rain",
    6201: "Heavy Freezing Rain",
    7000: "Ice Pellets",
    7101: "Heavy Ice Pellets",
    7102: "Light Ice Pellets",
    8000: "Thunderstorm",
  };
  return codes[code] || `Code ${code}`;
};

// Define the tool to fetch weather data
const fetchWeatherAndForecastTool = ai.defineTool(
  {
    name: 'fetchWeatherAndForecast',
    description: 'Fetches current weather and a 7-day forecast for a given latitude and longitude from the tomorrow.io API.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherAndForecastOutputSchema,
  },
  async (input: GetWeatherInput) => {
    console.log(`Fetching weather & forecast for lat: ${input.latitude}, lon: ${input.longitude}`);
    const apiKey = process.env.TOMORROW_IO_API_KEY;

    if (!apiKey) {
      console.error('TOMORROW_IO_API_KEY is not set in environment variables.');
      throw new Error('TOMORROW_IO_API_KEY is not set in environment variables.');
    }

    const currentFields = [
      "temperature", "humidity", "windSpeed", "weatherCode", "precipitationProbability",
      "uvIndex", "pressureSeaLevel"
    ];
    const forecastFields = [
      "temperatureMax", "temperatureMin", "weatherCodeDay", 
      "precipitationProbabilityAvg",
    ];
    
    const allFields = [...new Set([...currentFields, ...forecastFields])].join(",");
    const timesteps = "current,1d"; 
    const startTime = startOfDay(new Date()).toISOString(); 
    const endTime = format(addDays(new Date(), 7), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\''); 
    
    const apiUrl = `https://api.tomorrow.io/v4/timelines?location=${input.latitude},${input.longitude}&fields=${allFields}&timesteps=${timesteps}&units=metric&apikey=${apiKey}&startTime=${startTime}&endTime=${endTime}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error (${response.status}) fetching weather/forecast: ${errorBody}`);
        throw new Error(`Failed to fetch weather/forecast data from tomorrow.io: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (!data.data?.timelines?.[0]?.intervals || data.data.timelines[0].intervals.length === 0) {
        console.error('Unexpected API response structure or empty intervals for weather/forecast:', data);
        throw new Error('Invalid or empty data structure received from weather API.');
      }

      const intervals = data.data.timelines[0].intervals;
      let parsedCurrentWeather: CurrentWeatherData | null = null;
      const parsedForecastItems: DailyForecastItem[] = [];
      const now = new Date();

      // Find current weather data: the first interval that doesn't have temperatureMax is likely current.
      // Or, if multiple, pick the one with startTime closest to now but not in the future.
      let potentialCurrentInterval = null;
      for (const interval of intervals) {
        if (interval.values.temperature !== undefined && interval.values.temperatureMax === undefined) {
          const intervalDate = new Date(interval.startTime);
          if (!potentialCurrentInterval || (intervalDate <= now && (!potentialCurrentInterval.startTime || intervalDate > new Date(potentialCurrentInterval.startTime)))) {
            potentialCurrentInterval = interval;
          }
        }
      }
      
      // If no clear "current" interval found based on above, try the first interval if it looks current-like.
      if (!potentialCurrentInterval && intervals.length > 0 && intervals[0].values.temperature !== undefined && intervals[0].values.temperatureMax === undefined) {
        potentialCurrentInterval = intervals[0];
        console.log("Using intervals[0] as current weather by heuristic.");
      }


      if (potentialCurrentInterval && potentialCurrentInterval.values) {
        const cv = potentialCurrentInterval.values;
        parsedCurrentWeather = {
          temperature: Math.round(cv.temperature ?? 0),
          humidity: Math.round(cv.humidity ?? 0),
          windSpeed: Math.round((cv.windSpeed ?? 0) * 3.6 * 10) / 10, // m/s to km/h, rounded to 1 decimal
          weatherCode: cv.weatherCode ?? 0,
          precipitationProbability: Math.round(cv.precipitationProbability ?? 0),
          uvIndex: Math.round(cv.uvIndex ?? 0),
          pressure: Math.round(cv.pressureSeaLevel ?? 1000),
          weatherDescription: weatherCodeToString(cv.weatherCode),
        };
      } else {
        console.warn("Could not find a suitable 'current' weather interval. Using default values.");
        parsedCurrentWeather = { 
            temperature: 0, humidity: 0, windSpeed: 0, weatherCode: 0, 
            precipitationProbability: 0, uvIndex: 0, pressure: 1000, weatherDescription: "Unavailable" 
        };
      }

      // Extract daily forecast items
      for (const interval of intervals) {
        // Daily intervals are identified by having temperatureMax and temperatureMin
        if (interval.values.temperatureMax !== undefined && interval.values.temperatureMin !== undefined) {
          if (parsedForecastItems.length < 7) { // Limit to 7 days
            parsedForecastItems.push({
              date: format(new Date(interval.startTime), 'yyyy-MM-dd'),
              tempMax: Math.round(interval.values.temperatureMax ?? 0),
              tempMin: Math.round(interval.values.temperatureMin ?? 0),
              weatherCode: interval.values.weatherCodeDay ?? interval.values.weatherCode ?? 0,
              weatherDescription: weatherCodeToString(interval.values.weatherCodeDay ?? interval.values.weatherCode, true),
              precipitationProbability: Math.round(interval.values.precipitationProbabilityAvg ?? interval.values.precipitationProbability ?? 0),
            });
          }
        }
      }
      
      // Sort forecast items by date, just in case they are not in order from the API
      parsedForecastItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Ensure we have exactly 7 forecast days, padding if necessary
      const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
      let currentForecastDayIndex = parsedForecastItems.findIndex(f => f.date >= todayStr);
      if (currentForecastDayIndex === -1 && parsedForecastItems.length > 0) {
        // If all forecast dates are in the past (unlikely with correct API call), or some other issue.
        // Fallback to taking first available, or just pad all if empty.
        currentForecastDayIndex = 0; 
      } else if (currentForecastDayIndex === -1 && parsedForecastItems.length === 0) {
        // No forecast items at all
         currentForecastDayIndex = 0; // Will result in full padding
      }


      const finalForecastItems: DailyForecastItem[] = [];
      let baseDate = startOfDay(new Date());
      if (parsedForecastItems.length > 0 && currentForecastDayIndex > -1) {
         // If we have some forecast data, try to align it starting from today or the first available future date
         const firstForecastDate = new Date(parsedForecastItems[currentForecastDayIndex].date + 'T00:00:00Z'); // Ensure parsing as UTC date
         if (firstForecastDate >= baseDate) {
            baseDate = firstForecastDate;
         }
      }


      for (let i = 0; i < 7; i++) {
        const targetDateStr = format(addDays(baseDate, i), 'yyyy-MM-dd');
        const existingForecastDay = parsedForecastItems.find(f => f.date === targetDateStr);
        if (existingForecastDay) {
          finalForecastItems.push(existingForecastDay);
        } else {
          console.warn(`Padding forecast for date: ${targetDateStr}. Original count: ${parsedForecastItems.length}`);
          finalForecastItems.push({
            date: targetDateStr,
            tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0
          });
        }
      }

      return {
        current: parsedCurrentWeather, // This is now guaranteed to be an object
        forecast: finalForecastItems.slice(0,7), // Ensure exactly 7 days
      };

    } catch (error) {
      console.error("Error in fetchWeatherAndForecastTool:", error);
      // Fallback to a default structure on any error to satisfy the schema
        const fallbackCurrent: CurrentWeatherData = { 
            temperature: 0, humidity: 0, windSpeed: 0, weatherCode: 0, 
            precipitationProbability: 0, uvIndex: 0, pressure: 1000, weatherDescription: "Error fetching" 
        };
        const fallbackForecast: DailyForecastItem[] = [];
        for (let i = 0; i < 7; i++) {
            fallbackForecast.push({
                date: format(addDays(new Date(), i), 'yyyy-MM-dd'),
                tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0
            });
        }
        return { current: fallbackCurrent, forecast: fallbackForecast };
    }
  }
);

// Define the flow that uses the tool
const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherAndForecastOutputSchema,
  },
  async (input) => {
    return await fetchWeatherAndForecastTool(input);
  }
);

// Exported wrapper function to be called from React components
export async function getWeather(input: GetWeatherInput): Promise<WeatherAndForecastOutput> {
  return getWeatherFlow(input);
}

    