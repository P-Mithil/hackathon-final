
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load .env first (if it exists)
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });
// Then, load .env.local (if it exists) and allow it to override variables from .env
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import '@/ai/flows/ai-crop-advisor.ts';
import '@/ai/flows/get-weather-flow.ts';
import '@/ai/flows/getPestAlertsFlow.ts';
import '@/ai/flows/getMarketTrendsFlow.ts';
