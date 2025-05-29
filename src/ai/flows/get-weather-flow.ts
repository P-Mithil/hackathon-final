
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

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('Latitude of the location.'),
  longitude: z.number().describe('Longitude of the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

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

const DailyForecastItemSchema = z.object({
  date: z.string().describe('Date of the forecast (e.g., "YYYY-MM-DD").'),
  tempMax: z.number().describe('Maximum temperature for the day in Celsius.'),
  tempMin: z.number().describe('Minimum temperature for the day in Celsius.'),
  weatherCode: z.number().describe('Weather condition code for the day.'),
  weatherDescription: z.string().describe('Textual description of the weather for the day.'),
  precipitationProbability: z.number().describe('Average probability of precipitation for the day.'),
});
export type DailyForecastItem = z.infer<typeof DailyForecastItemSchema>;

const WeatherAndForecastOutputSchema = z.object({
  current: CurrentWeatherDataSchema.describe('Current weather conditions.'),
  forecast: z.array(DailyForecastItemSchema).length(7).describe('A 7-day weather forecast.'),
});
export type WeatherAndForecastOutput = z.infer<typeof WeatherAndForecastOutputSchema>;


const weatherCodeToString = (code: number | undefined, isDay: boolean = true): string => {
  if (code === undefined) return "Weather data unavailable";
  const codes: Record<number, string> = {
    0: "Unknown", 1000: "Clear", 1001: "Cloudy", 1100: "Mostly Clear", 1101: "Partly Cloudy",
    1102: "Mostly Cloudy", 2000: "Fog", 2100: "Light Fog", 4000: "Drizzle", 4001: "Rain",
    4200: "Light Rain", 4201: "Heavy Rain", 5000: "Snow", 5001: "Flurries",
    5100: "Light Snow", 5101: "Heavy Snow", 6000: "Freezing Drizzle", 6001: "Freezing Rain",
    6200: "Light Freezing Rain", 6201: "Heavy Freezing Rain", 7000: "Ice Pellets",
    7101: "Heavy Ice Pellets", 7102: "Light Ice Pellets", 8000: "Thunderstorm",
  };
  return codes[code] || `Code ${code}`;
};

const fallbackCurrent: CurrentWeatherData = {
    temperature: 0, humidity: 0, windSpeed: 0, weatherCode: 0,
    precipitationProbability: 0, uvIndex: 0, pressure: 1000, weatherDescription: "Unavailable"
};

const createFallbackForecast = (): DailyForecastItem[] => {
    const forecast: DailyForecastItem[] = [];
    for (let i = 0; i < 7; i++) {
        forecast.push({
            date: format(addDays(startOfDay(new Date()), i), 'yyyy-MM-dd'),
            tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0
        });
    }
    return forecast;
};


const fetchWeatherAndForecastTool = ai.defineTool(
  {
    name: 'fetchWeatherAndForecast',
    description: 'Fetches current weather and a 7-day forecast for a given latitude and longitude from the tomorrow.io API using separate calls for current and forecast data.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherAndForecastOutputSchema,
  },
  async (input: GetWeatherInput): Promise<WeatherAndForecastOutput> => {
    console.log(`Fetching weather & forecast for lat: ${input.latitude}, lon: ${input.longitude}`);
    const apiKey = process.env.TOMORROW_IO_API_KEY;

    if (!apiKey) {
      console.error('TOMORROW_IO_API_KEY is not set in environment variables.');
      // Do not throw here, return fallback data to satisfy schema
      return { current: fallbackCurrent, forecast: createFallbackForecast() };
    }

    let parsedCurrentWeather: CurrentWeatherData = { ...fallbackCurrent };
    let parsedForecastItems: DailyForecastItem[] = createFallbackForecast();

    // 1. Fetch Current Weather
    const currentFields = "temperature,humidity,windSpeed,weatherCode,precipitationProbability,uvIndex,pressureSeaLevel";
    const currentApiUrl = `https://api.tomorrow.io/v4/timelines?location=${input.latitude},${input.longitude}&fields=${currentFields}&timesteps=current&units=metric&apikey=${apiKey}`;

    try {
      const currentResponse = await fetch(currentApiUrl);
      if (!currentResponse.ok) {
        const errorBody = await currentResponse.text();
        console.error(`API Error (${currentResponse.status}) fetching current weather: ${errorBody}`);
        // Continue to fetch forecast, current weather will use fallback
      } else {
        const currentData = await currentResponse.json();
        if (currentData.data?.timelines?.[0]?.intervals?.[0]?.values) {
          const cv = currentData.data.timelines[0].intervals[0].values;
          parsedCurrentWeather = {
            temperature: Math.round(cv.temperature ?? 0),
            humidity: Math.round(cv.humidity ?? 0),
            windSpeed: Math.round((cv.windSpeed ?? 0) * 3.6 * 10) / 10, // m/s to km/h
            weatherCode: cv.weatherCode ?? 0,
            precipitationProbability: Math.round(cv.precipitationProbability ?? 0),
            uvIndex: Math.round(cv.uvIndex ?? 0),
            pressure: Math.round(cv.pressureSeaLevel ?? 1000),
            weatherDescription: weatherCodeToString(cv.weatherCode),
          };
        } else {
            console.warn('Unexpected API response structure or empty intervals for current weather:', currentData);
        }
      }
    } catch (error) {
      console.error("Error fetching or parsing current weather:", error);
      // Current weather will use fallback
    }

    // 2. Fetch 7-Day Forecast
    const forecastFields = "temperatureMax,temperatureMin,weatherCodeDay,precipitationProbability";
    const forecastStartTime = format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const forecastEndTime = format(addDays(startOfDay(new Date()), 7), "yyyy-MM-dd'T'HH:mm:ss'Z'"); // API usually includes the end day
    const forecastApiUrl = `https://api.tomorrow.io/v4/timelines?location=${input.latitude},${input.longitude}&fields=${forecastFields}&timesteps=1d&startTime=${forecastStartTime}&endTime=${forecastEndTime}&units=metric&apikey=${apiKey}`;
    
    try {
      const forecastResponse = await fetch(forecastApiUrl);
      if (!forecastResponse.ok) {
        const errorBody = await forecastResponse.text();
        console.error(`API Error (${forecastResponse.status}) fetching forecast: ${errorBody}`);
        // Forecast will use fallback
      } else {
        const forecastData = await forecastResponse.json();
        if (forecastData.data?.timelines?.[0]?.intervals) {
          const intervals = forecastData.data.timelines[0].intervals;
          const tempForecastItems: DailyForecastItem[] = [];
          
          for (const interval of intervals) {
            if (interval.values && tempForecastItems.length < 7) {
              const forecastDate = new Date(interval.startTime);
               // Ensure we are not taking past days if API returns them by mistake with current startTime logic
              if (startOfDay(forecastDate) >= startOfDay(new Date())) {
                tempForecastItems.push({
                    date: format(forecastDate, 'yyyy-MM-dd'),
                    tempMax: Math.round(interval.values.temperatureMax ?? 0),
                    tempMin: Math.round(interval.values.temperatureMin ?? 0),
                    weatherCode: interval.values.weatherCodeDay ?? interval.values.weatherCode ?? 0,
                    weatherDescription: weatherCodeToString(interval.values.weatherCodeDay ?? interval.values.weatherCode, true),
                    precipitationProbability: Math.round(interval.values.precipitationProbability ?? 0),
                });
              }
            }
          }
          
          // Sort and pad/truncate to ensure exactly 7 days starting from today
          if (tempForecastItems.length > 0) {
            tempForecastItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const finalForecast: DailyForecastItem[] = [];
            for (let i = 0; i < 7; i++) {
              const targetDate = format(addDays(startOfDay(new Date()), i), 'yyyy-MM-dd');
              const foundDay = tempForecastItems.find(f => f.date === targetDate);
              if (foundDay) {
                finalForecast.push(foundDay);
              } else {
                // Pad if specific day is missing
                finalForecast.push({
                  date: targetDate, tempMax: 0, tempMin: 0, weatherCode: 0,
                  weatherDescription: "N/A", precipitationProbability: 0,
                });
              }
            }
            parsedForecastItems = finalForecast;
          } else {
             console.warn('No valid forecast intervals found or parsed.');
          }
        } else {
            console.warn('Unexpected API response structure or empty intervals for forecast:', forecastData);
        }
      }
    } catch (error) {
      console.error("Error fetching or parsing forecast:", error);
      // Forecast will use fallback
    }

    return {
      current: parsedCurrentWeather,
      forecast: parsedForecastItems.slice(0, 7), // Ensure exactly 7 days
    };
  }
);

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

export async function getWeather(input: GetWeatherInput): Promise<WeatherAndForecastOutput> {
  return getWeatherFlow(input);
}
