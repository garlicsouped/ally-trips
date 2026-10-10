/* ============================================================
   SUPABASE CLIENT
   Your Project URL and Publishable key go here. Both are safe
   to keep in plain client side code, the publishable key only
   identifies your project, it does not grant access on its own,
   real protection comes from the Row Level Security policy on
   the trips table (see supabase-schema.sql).

   Requires the Supabase JS library to be loaded first via the
   CDN script tag already added to each HTML page:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   ============================================================ */

const SUPABASE_URL = 'https://wdoncmfpvoixxugxboyj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Yj9G5gc7YwaQ6uRQGepT3g_W-VuznRk';

let supabaseClient = null;

try {
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } else {
    console.error('Supabase library did not load, check the CDN script tag in this page.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase client', e);
}
