
'use server';
/**
 * @fileOverview AI-powered agricultural market trends and insights flow.
 *
 * - getMarketTrends - A function that provides market insights for crops based on location.
 * - GetMarketTrendsInput - The input type for the getMarketTrends function.
 * - GetMarketTrendsOutput - The return type for the getMarketTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetMarketTrendsInputSchema = z.object({
  latitude: z.number().describe('Latitude of the location.'),
  longitude: z.number().describe('Longitude of the location.'),
});
export type GetMarketTrendsInput = z.infer<typeof GetMarketTrendsInputSchema>;

const MarketCropTrendItemSchema = z.object({
  cropName: z.string().describe('Common name of the crop.'),
  estimatedPrice: z
    .string()
    .describe(
      'Simulated or estimated current market price for the crop (e.g., "$250/ton", "€0.80/kg").'
    ),
  priceTrend: z
    .enum(['Rising', 'Stable', 'Falling'])
    .describe('The general short-term price trend for this crop.'),
  demandOutlook: z
    .enum(['Strong', 'Moderate', 'Weak'])
    .describe('The general demand outlook for this crop.'),
  volatility: z
    .enum(['High', 'Medium', 'Low'])
    .describe('Assessed market price volatility for this crop.'),
  rationale: z
    .string()
    .describe(
      'A brief rationale explaining the trends for this crop in the region.'
    ),
});
export type MarketCropTrendItem = z.infer<typeof MarketCropTrendItemSchema>;

const GetMarketTrendsOutputSchema = z.object({
  regionalCrops: z
    .array(MarketCropTrendItemSchema)
    .min(2).max(4)
    .describe(
      'List of 2-4 key agricultural crops relevant to the location with their market trends.'
    ),
  marketSummary: z
    .string()
    .describe(
      'A brief general market overview or summary for the agricultural sector in the given location.'
    ),
  recommendedCrop: z.string().optional().describe('The single crop name from the list that is identified as the most promising or best overall recommendation based on the current analysis. This field can be omitted if no single crop stands out significantly.'),
  recommendationRationale: z.string().optional().describe('A brief explanation for why the recommendedCrop was chosen as the most promising, or why no specific recommendation was made.'),
});
export type GetMarketTrendsOutput = z.infer<typeof GetMarketTrendsOutputSchema>;

export async function getMarketTrends(
  input: GetMarketTrendsInput
): Promise<GetMarketTrendsOutput> {
  return getMarketTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMarketTrendsPrompt',
  input: {schema: GetMarketTrendsInputSchema},
  output: {schema: GetMarketTrendsOutputSchema},
  prompt: `You are an agricultural market analyst AI. Based on the provided geographical coordinates (Latitude: {{{latitude}}}, Longitude: {{{longitude}}}), identify 2-4 key agricultural crops commonly grown or relevant to this general region and its typical climate.

For each identified crop, provide the following market insights:
1.  **Crop Name**: The common name of the crop.
2.  **Estimated Price**: A realistic, simulated current market price. Include units (e.g., "$250/ton", "€0.80/kg").
3.  **Price Trend**: Assess the short-term price trend as 'Rising', 'Stable', or 'Falling'.
4.  **Demand Outlook**: Assess the demand outlook as 'Strong', 'Moderate', or 'Weak'.
5.  **Volatility**: Assess the market price volatility as 'High', 'Medium', 'Low'.
6.  **Rationale**: Briefly explain the key factors influencing these trends for the crop in this region.

After analyzing these crops, identify the **Recommended Crop**. This should be the single crop from your list that you believe offers the best overall potential or is most promising for a farmer in this region, considering all factors. Populate the 'recommendedCrop' field with its name.
Provide a **Recommendation Rationale** explaining why this specific crop is recommended. Populate the 'recommendationRationale' field. If, after your analysis, no single crop stands out as significantly more promising than others, you may omit the 'recommendedCrop' field and briefly explain why in the 'recommendationRationale'.

Additionally, provide a concise **Market Summary** (2-3 sentences) giving a general overview of the agricultural market sentiment or notable conditions for this location.

Focus on common agricultural commodities. If the location is clearly unsuitable for significant agriculture (e.g., deep ocean, polar ice cap, major urban center with no surrounding farmland), state that in the market summary and recommendation rationale, provide an empty list for regionalCrops, and omit recommendedCrop.

Format your entire response according to the output schema.
Example for a crop item:
  cropName: "Corn"
  estimatedPrice: "$220/ton"
  priceTrend: "Stable"
  demandOutlook: "Moderate"
  volatility: "Medium"
  rationale: "Global supply is steady, biofuel demand provides a floor price, but export competition limits upside."

Example for output structure with recommendation:
{
  "regionalCrops": [
    { "cropName": "Wheat", ... },
    { "cropName": "Soybeans", ... }
  ],
  "marketSummary": "The market is currently stable...",
  "recommendedCrop": "Soybeans",
  "recommendationRationale": "Soybeans are recommended due to strong export demand and favorable price trends despite medium volatility."
}
`,
});

const getMarketTrendsFlow = ai.defineFlow(
  {
    name: 'getMarketTrendsFlow',
    inputSchema: GetMarketTrendsInputSchema,
    outputSchema: GetMarketTrendsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get market trends from AI model.');
    }
    return output;
  }
);

