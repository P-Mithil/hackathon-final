
'use server';
/**
 * @fileOverview Weather data fetching flow and tool.
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

// Define the tool to fetch weather data
// For now, this tool returns mock data.
// In a real scenario, this would call the tomorrow.io API.
const fetchWeatherDataTool = ai.defineTool(
  {
    name: 'fetchWeatherData',
    description: 'Fetches current weather data for a given latitude and longitude from an external API.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: WeatherDataSchema,
  },
  async (input: GetWeatherInput) => {
    console.log(`Fetching weather for lat: ${input.latitude}, lon: ${input.longitude}`);
    // const apiKey = process.env.TOMORROW_IO_API_KEY;
    // if (!apiKey) {
    //   throw new Error('TOMORROW_IO_API_KEY is not set in environment variables.');
    // }
    // TODO: Implement actual API call to tomorrow.io
    // Example: const response = await fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${input.latitude},${input.longitude}&apikey=${apiKey}`);
    // const data = await response.json();
    // return transformDataToSchema(data); // You'll need a function to map API response to WeatherDataSchema

    // Mock data for now:
    return {
      temperature: 28 + Math.round(Math.random() * 5 - 2.5), // Randomize slightly
      humidity: 60 + Math.round(Math.random() * 10 - 5),
      windSpeed: 10 + Math.round(Math.random() * 5 - 2.5),
      weatherCode: 1000, // Clear
      precipitationProbability: 10 + Math.round(Math.random() * 10),
      uvIndex: 7 + Math.round(Math.random() * 2 -1),
      pressure: 1012 + Math.round(Math.random() * 3 - 1.5),
      weatherDescription: 'Sunny with occasional clouds',
    };
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
    // Here, we directly call the tool.
    // If we had an LLM making a decision, we'd pass the tool to a prompt.
    return await fetchWeatherDataTool(input);
  }
);

// Exported wrapper function to be called from React components
export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}
