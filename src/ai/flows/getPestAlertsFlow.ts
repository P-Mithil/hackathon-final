
'use server';
/**
 * @fileOverview AI-powered pest alert and advisory flow.
 *
 * - getPestAlerts - A function that provides pest alerts based on location.
 * - GetPestAlertsInput - The input type for the getPestAlerts function.
 * - GetPestAlertsOutput - The return type for the getPestAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetPestAlertsInputSchema = z.object({
  latitude: z.number().describe('Latitude of the location.'),
  longitude: z.number().describe('Longitude of the location.'),
  // Optional: Could add current weather summary if available to give more context
  // weatherSummary: z.string().optional().describe('A brief summary of current weather conditions.')
});
export type GetPestAlertsInput = z.infer<typeof GetPestAlertsInputSchema>;

const PestAlertItemSchema = z.object({
  pestName: z.string().describe('Common name of the pest.'),
  riskLevel: z
    .enum(['High', 'Medium', 'Low', 'Info'])
    .describe('Assessed risk level for this pest in the area.'),
  description: z
    .string()
    .describe(
      'Brief description of the pest, its potential impact, or current alert status.'
    ),
  recommendation: z
    .string()
    .describe('Brief recommended action, preventative measure, or advisory.'),
});
export type PestAlertItem = z.infer<typeof PestAlertItemSchema>;

const GetPestAlertsOutputSchema = z.object({
  alerts: z
    .array(PestAlertItemSchema)
    .describe(
      'List of current pest alerts and advisories relevant to the location. Aim for 2-3 distinct alerts.'
    ),
  generalAdvice: z
    .string()
    .describe(
      'General pest prevention advice for the region, or a summary if no specific high-risk alerts are active. This could include common preventative measures.'
    ),
});
export type GetPestAlertsOutput = z.infer<typeof GetPestAlertsOutputSchema>;

export async function getPestAlerts(
  input: GetPestAlertsInput
): Promise<GetPestAlertsOutput> {
  return getPestAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getPestAlertsPrompt',
  input: {schema: GetPestAlertsInputSchema},
  output: {schema: GetPestAlertsOutputSchema},
  prompt: `You are an agricultural pest control advisor. Based on the provided geographical coordinates (Latitude: {{{latitude}}}, Longitude: {{{longitude}}}), identify 2-3 potential agricultural pest threats common to this general region and climate.

For each pest, provide:
1.  **Pest Name**: The common name of the pest.
2.  **Risk Level**: Assess a general risk level (High, Medium, Low, Info) for this type of pest in such a region.
3.  **Description**: A brief description of the pest or why it might be a concern.
4.  **Recommendation**: A short, actionable recommendation or preventative tip.

Additionally, provide some brief **General Advice** for pest prevention suitable for the inferred agricultural environment of this location.

Focus on common agricultural pests. If the location is not suitable for agriculture (e.g., ocean, desert), state that and provide no specific pest alerts.
Example of a good alert item:
  Pest Name: Corn Earworm
  Risk Level: Medium
  Description: Larvae feed on corn silks and kernels, reducing yield and quality.
  Recommendation: Monitor silk stage closely; consider pheromone traps.

Format your entire response according to the output schema.
`,
});

const getPestAlertsFlow = ai.defineFlow(
  {
    name: 'getPestAlertsFlow',
    inputSchema: GetPestAlertsInputSchema,
    outputSchema: GetPestAlertsOutputSchema,
  },
  async input => {
    // In a real scenario, you might first use a geocoding service or a climate API
    // to get more specific regional/agricultural context from lat/lon to pass to the LLM.
    // For now, we rely on the LLM's general knowledge.
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get pest alerts from AI model.');
    }
    return output;
  }
);
