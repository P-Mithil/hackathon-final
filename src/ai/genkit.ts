
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Attempt to read the API key from environment variables
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey && process.env.NODE_ENV === 'development') {
  // This console log will appear in the Genkit dev server terminal if the key is missing
  // It's helpful during development.
  console.warn(
    'WARNING: GOOGLE_API_KEY is not set in the environment. Genkit AI flows relying on Google AI will likely fail. Ensure it is set in your .env.local file and the Genkit server is restarted.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleApiKey, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
