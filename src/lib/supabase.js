import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    console.error(
      '❌ CRITICAL: Supabase credentials not found in production!\n' +
      'This will cause login and data persistence to fail.\n\n' +
      'Fix this in Vercel:\n' +
      '1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables\n' +
      '2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n' +
      '3. Make sure they are set for PRODUCTION environment\n' +
      '4. Redeploy your application\n\n' +
      'Get credentials from: https://app.supabase.com → Your Project → Settings → API'
    );
  } else {
    console.warn(
      '⚠️ Supabase credentials not found. Running in demo mode with localStorage.\n' +
      'To enable Supabase, create a .env file in the project root with:\n' +
      'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
      'VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
      'Get these from: https://app.supabase.com → Your Project → Settings → API'
    );
  }
} else {
  // Validate URL format
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.error(
      '❌ Invalid Supabase URL format. Expected: https://xxxxx.supabase.co\n' +
      `Current value: ${supabaseUrl}\n\n` +
      'Fix in Vercel: Settings → Environment Variables → VITE_SUPABASE_URL'
    );
  }
  
  // Check for common URL mistakes
  if (supabaseUrl.includes('xxx') || supabaseUrl.match(/https?:\/\/[^/]+\/\/[^/]+/)) {
    console.error(
      '❌ Supabase URL appears malformed!\n' +
      `Current value: ${supabaseUrl}\n` +
      'Expected format: https://your-project-id.supabase.co\n' +
      'Check Vercel environment variables for typos or extra characters.'
    );
  }
  
  // Log the URL being used (for debugging, but mask sensitive parts)
  const maskedUrl = supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co/, 'https://***.supabase.co');
  console.log('🔗 Using Supabase URL:', maskedUrl);
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-auth-token'
      }
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;

