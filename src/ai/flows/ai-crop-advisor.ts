// 'use server';
/**
 * @fileOverview AI-powered crop suggestion tool for farmers.
 *
 * - aiCropAdvisor - A function that provides personalized crop suggestions based on farm data.
 * - AICropAdvisorInput - The input type for the aiCropAdvisor function.
 * - AICropAdvisorOutput - The return type for the aiCropAdvisor function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICropAdvisorInputSchema = z.object({
  soilType: z.string().describe('The type of soil on the farm.'),
  region: z.string().describe('The geographical region of the farm.'),
  cropHistory: z.string().describe('The history of crops grown on the farm.'),
  weatherData: z.string().describe('Real-time weather data for the farm.'),
  marketData: z.string().describe('Real-time market data for crops.'),
});
export type AICropAdvisorInput = z.infer<typeof AICropAdvisorInputSchema>;

const AICropAdvisorOutputSchema = z.object({
  cropSuggestions: z
    .string()
    .describe('Personalized crop suggestions based on the farm data.'),
  rationale: z.string().describe('The rationale behind the crop suggestions.'),
});
export type AICropAdvisorOutput = z.infer<typeof AICropAdvisorOutputSchema>;

export async function aiCropAdvisor(input: AICropAdvisorInput): Promise<AICropAdvisorOutput> {
  return aiCropAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCropAdvisorPrompt',
  input: {schema: AICropAdvisorInputSchema},
  output: {schema: AICropAdvisorOutputSchema},
  prompt: `You are an AI crop advisor providing personalized crop suggestions to farmers.

You will analyze the farm's data, including soil type, region, crop history, weather data, and market data, to provide the best crop suggestions.

Soil Type: {{{soilType}}}
Region: {{{region}}}
Crop History: {{{cropHistory}}}
Weather Data: {{{weatherData}}}
Market Data: {{{marketData}}}

Based on this information, what crops would you recommend to the farmer, and why?
`,
});

const aiCropAdvisorFlow = ai.defineFlow(
  {
    name: 'aiCropAdvisorFlow',
    inputSchema: AICropAdvisorInputSchema,
    outputSchema: AICropAdvisorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
