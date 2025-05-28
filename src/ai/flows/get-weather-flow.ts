
'use server';
/**
 * @fileOverview Weather data fetching flow and tool using tomorrow.io API.
 *
 * - getWeather - A function that fetches current weather and 5-day forecast.
 * - GetWeatherInput - The input type for the getWeather function.
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
  current: CurrentWeatherDataSchema,
  forecast: z.array(DailyForecastItemSchema).length(5).describe('A 5-day weather forecast.'),
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
    // Add more specific day/night codes if needed for icons
  };
  return codes[code] || `Code ${code}`;
};

// Define the tool to fetch weather data
const fetchWeatherAndForecastTool = ai.defineTool(
  {
    name: 'fetchWeatherAndForecast',
    description: 'Fetches current weather and a 5-day forecast for a given latitude and longitude from the tomorrow.io API.',
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

    const commonFields = [
      "temperature", "humidity", "windSpeed", "weatherCode", "precipitationProbability",
      "uvIndex", "pressureSeaLevel" // For current weather
    ];
    const forecastFields = [
      "temperatureMax", "temperatureMin", "weatherCodeDay", // weatherCodeDay for daily summary
      "precipitationProbabilityAvg", // Average precipitation probability for the day
    ];
    
    const allFields = [...new Set([...commonFields, ...forecastFields])].join(",");
    const timesteps = "current,1d"; // Request current data and 1-day intervals
    const startTime = startOfDay(new Date()).toISOString(); // Forecast starting from today
    const endTime = format(addDays(new Date(), 5), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\''); // 5 days forecast + today = 6 intervals for 1d if today is included

    const apiUrl = `https://api.tomorrow.io/v4/timelines?location=${input.latitude},${input.longitude}&fields=${allFields}&timesteps=${timesteps}&units=metric&apikey=${apiKey}&startTime=${startTime}&endTime=${endTime}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error (${response.status}) fetching weather/forecast: ${errorBody}`);
        throw new Error(`Failed to fetch weather/forecast data from tomorrow.io: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (!data.data?.timelines?.[0]?.intervals) {
        console.error('Unexpected API response structure for weather/forecast:', data);
        throw new Error('Invalid data structure received from weather API.');
      }

      const intervals = data.data.timelines[0].intervals;
      
      // Find current weather data (should be the first interval with timestep 'current')
      // Or, if timeline starts with 1d, the first interval is today's summary.
      // Tomorrow.io API might return current as the first one if 'current' is first in timesteps query param
      let currentWeatherData: CurrentWeatherData | null = null;
      let dailyForecastItems: DailyForecastItem[] = [];

      const currentInterval = intervals.find((interval: any) => interval.startTime === format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'', { timeZone: 'UTC' }) || new Date(interval.startTime).getHours() === new Date().getUTCHours());


      let currentValues: any;
      if (intervals.length > 0 && intervals[0].values.temperature !== undefined) { // Heuristic: if first interval has 'temperature', it's current
          currentValues = intervals[0].values;
          currentWeatherData = {
            temperature: Math.round(currentValues.temperature ?? 0),
            humidity: Math.round(currentValues.humidity ?? 0),
            windSpeed: Math.round((currentValues.windSpeed ?? 0) * 3.6 * 10) / 10, // m/s to km/h
            weatherCode: currentValues.weatherCode ?? 0,
            precipitationProbability: Math.round(currentValues.precipitationProbability ?? 0),
            uvIndex: currentValues.uvIndex ?? 0,
            pressure: Math.round(currentValues.pressureSeaLevel ?? 1000),
            weatherDescription: weatherCodeToString(currentValues.weatherCode),
          };
      } else {
        // Fallback if current data isn't clearly the first interval, or set defaults
         currentWeatherData = {
            temperature: 0, humidity: 0, windSpeed: 0, weatherCode: 0,
            precipitationProbability: 0, uvIndex: 0, pressure: 1000, weatherDescription: "Unavailable",
         };
         console.warn("Could not definitively parse current weather from intervals. Using fallback.");
      }


      // Parse daily forecast data (intervals with timestep '1d')
      // We need the next 5 days, starting from tomorrow if current is today. Or start from today if current is truly 'current' instant.
      // The API returns intervals including "today". We want 5 days starting from tomorrow.
      // If currentWeatherData was derived from intervals[0], then forecast starts from intervals[1].
      
      let forecastStartIndex = 1; // Assuming intervals[0] was current
      // If the first interval was already a daily summary for today, we still want the next 5 days.
      // Let's ensure we grab 5 forecast days.
      // API `endTime` for 5 days means we should get 6 intervals if 'current' isn't part of the '1d' intervals.
      // If 'current' is separate, we need 5 '1d' intervals.

      const forecastIntervals = intervals.filter((interval: any) => {
        // Check if tempMax exists, indicating it's a daily summary interval
        return interval.values.temperatureMax !== undefined;
      });


      for (let i = 0; i < forecastIntervals.length && dailyForecastItems.length < 5; i++) {
        const dayData = forecastIntervals[i];
        if (new Date(dayData.startTime) >= startOfDay(addDays(new Date(), 1)) || (i === 0 && dailyForecastItems.length === 0)) { // Start from tomorrow or today if it's the first daily data
             dailyForecastItems.push({
                date: format(new Date(dayData.startTime), 'yyyy-MM-dd'),
                tempMax: Math.round(dayData.values.temperatureMax ?? 0),
                tempMin: Math.round(dayData.values.temperatureMin ?? 0),
                weatherCode: dayData.values.weatherCodeDay ?? (dayData.values.weatherCode ?? 0), // Prefer weatherCodeDay
                weatherDescription: weatherCodeToString(dayData.values.weatherCodeDay ?? dayData.values.weatherCode, true),
                precipitationProbability: Math.round(dayData.values.precipitationProbabilityAvg ?? (dayData.values.precipitationProbability ?? 0)),
            });
        }
      }
      
      // If we got today's forecast as the first one, and we need 5 more days.
      // And if current weather data was distinct from the first daily interval
      if (dailyForecastItems.length < 5 && forecastIntervals.length > 0) {
          // This logic might be complex if the API returns current and today's daily separately.
          // Simplification: Ensure we have 5 forecast items. If not, pad or adjust.
          // For now, we rely on API returning enough daily intervals.
          // If the number of dailyForecastItems is less than 5, we might have an issue with data parsing or API response.
      }
       while (dailyForecastItems.length < 5) {
        console.warn(`Padding forecast. Expected 5 days, got ${dailyForecastItems.length}.`);
        const lastDate = dailyForecastItems.length > 0 ? dailyForecastItems[dailyForecastItems.length - 1].date : format(new Date(), 'yyyy-MM-dd');
        dailyForecastItems.push({
            date: format(addDays(new Date(lastDate), 1), 'yyyy-MM-dd'),
            tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0
        });
      }


      if (!currentWeatherData) {
        throw new Error("Could not parse current weather data from API response.");
      }
      if (dailyForecastItems.length !== 5) {
         console.warn(`Expected 5 forecast days, but parsed ${dailyForecastItems.length}. The response might be incomplete or parsing needs adjustment.`);
         // Ensure 5 items even if some are placeholders if API didn't provide enough
        while (dailyForecastItems.length < 5) {
            const lastDate = dailyForecastItems.length > 0 ? dailyForecastItems[dailyForecastItems.length - 1].date : format(new Date(), 'yyyy-MM-dd');
            dailyForecastItems.push({
                date: format(addDays(new Date(lastDate), 1), 'yyyy-MM-dd'),
                tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0
            });
        }
      }


      return {
        current: currentWeatherData,
        forecast: dailyForecastItems.slice(0,5), // Ensure exactly 5 days
      };

    } catch (error) {
      console.error("Error in fetchWeatherAndForecastTool:", error);
      if (error instanceof Error) {
        throw new Error(`Error fetching or processing weather/forecast data: ${error.message}`);
      }
      throw new Error("An unknown error occurred while fetching weather/forecast data.");
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

    