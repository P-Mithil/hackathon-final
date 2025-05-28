
'use server';
/**
 * @fileOverview Weather data fetching flow and tool using tomorrow.io API.
 *
 * - getWeather - A function that fetches weather data for a given location.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for the input (e.g., location)
const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('Latitude of the location.'),
  longitude: z.number().describe('Longitude of the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

// Define the schema for the output (weather data)
const WeatherDataSchema = z.object({
  temperature: z.number().describe('Current temperature in Celsius.'),
  humidity: z.number().describe('Current humidity percentage.'),
  windSpeed: z.number().describe('Current wind speed in km/h.'),
  weatherCode: z.number().describe('Weather condition code from tomorrow.io.'),
  precipitationProbability: z.number().describe('Probability of precipitation in percentage.'),
  uvIndex: z.number().describe('UV index.'),
  pressure: z.number().describe('Air pressure in hPa.'),
  weatherDescription: z.string().describe('A textual description of the weather.'),
});
export type GetWeatherOutput = z.infer<typeof WeatherDataSchema>;

const weatherCodeToString = (code: number | undefined): string => {
  if (code === undefined) return "Weather data unavailable";
  const codes: Record<number, string> = {
    0: "Unknown",
    1000: "Clear, Sunny",
    1100: "Mostly Clear",
    1101: "Partly Cloudy",
    1102: "Mostly Cloudy",
    1001: "Cloudy",
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
  return codes[code] || `Weather Code ${code}`;
};

// Define the tool to fetch weather data
const fetchWeatherDataTool = ai.defineTool(
  {
    name: 'fetchWeatherData',
    description: 'Fetches current weather data for a given latitude and longitude from the tomorrow.io API.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherDataSchema,
  },
  async (input: GetWeatherInput) => {
    console.log(`Fetching weather for lat: ${input.latitude}, lon: ${input.longitude}`);
    const apiKey = process.env.TOMORROW_IO_API_KEY;

    if (!apiKey) {
      console.error('TOMORROW_IO_API_KEY is not set in environment variables.');
      throw new Error('TOMORROW_IO_API_KEY is not set in environment variables.');
    }

    const fields = [
      "temperature",
      "humidity",
      "windSpeed",
      "weatherCode",
      "precipitationProbability",
      "uvIndex",
      "pressureSeaLevel"
    ].join(",");

    const apiUrl = `https://api.tomorrow.io/v4/timelines?location=${input.latitude},${input.longitude}&fields=${fields}&timesteps=current&units=metric&apikey=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error (${response.status}): ${errorBody}`);
        throw new Error(`Failed to fetch weather data from tomorrow.io: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (!data.data?.timelines?.[0]?.intervals?.[0]?.values) {
        console.error('Unexpected API response structure:', data);
        throw new Error('Invalid data structure received from weather API.');
      }

      const values = data.data.timelines[0].intervals[0].values;

      // Convert wind speed from m/s to km/h (1 m/s = 3.6 km/h)
      const windSpeedKmh = values.windSpeed !== undefined ? Math.round(values.windSpeed * 3.6 * 10) / 10 : 0;

      return {
        temperature: values.temperature !== undefined ? Math.round(values.temperature) : 0,
        humidity: values.humidity !== undefined ? Math.round(values.humidity) : 0,
        windSpeed: windSpeedKmh,
        weatherCode: values.weatherCode || 0,
        precipitationProbability: values.precipitationProbability !== undefined ? Math.round(values.precipitationProbability) : 0,
        uvIndex: values.uvIndex || 0,
        pressure: values.pressureSeaLevel !== undefined ? Math.round(values.pressureSeaLevel) : 1000,
        weatherDescription: weatherCodeToString(values.weatherCode),
      };
    } catch (error) {
      console.error("Error in fetchWeatherDataTool:", error);
      if (error instanceof Error) {
        throw new Error(`Error fetching or processing weather data: ${error.message}`);
      }
      throw new Error("An unknown error occurred while fetching weather data.");
    }
  }
);

// Define the flow that uses the tool
const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherDataSchema,
  },
  async (input) => {
    return await fetchWeatherDataTool(input);
  }
);

// Exported wrapper function to be called from React components
export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}
