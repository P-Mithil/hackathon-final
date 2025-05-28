import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  let missingVars = [];
  if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}. Please ensure they are set in your .env.local file and the development server is restarted.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCropAdvisorHistoryForUser(userId: string) {
  const { data, error } = await supabase
    .from('crop_advisor_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }); // Fetch newest entries first

  if (error) {
    console.error('Error fetching crop advisor history:', error);
    // Return the error object so the UI can handle it
    return { data: null, error };
  }

  return { data, error: null };
}
