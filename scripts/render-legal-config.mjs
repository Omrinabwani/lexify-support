import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(supabaseUrl)) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid hosted Supabase project URL.');
}

if (!(supabasePublishableKey.startsWith('sb_publishable_') || supabasePublishableKey.startsWith('eyJ'))) {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY must be a Supabase publishable or legacy anon key.');
}

const serialized = JSON.stringify({ supabasePublishableKey, supabaseUrl })
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');
const output = `window.__LEXIFY_PUBLIC_CONFIG__ = Object.freeze(${serialized});\n`;

writeFileSync(resolve('public/legal-config.js'), output, { encoding: 'utf8', mode: 0o600 });
console.log('Rendered the public legal-site backend configuration.');
