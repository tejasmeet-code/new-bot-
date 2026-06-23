const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.warn('SUPABASE_URL or SUPABASE_KEY is missing from .env!');
}

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_KEY || 'placeholder'
);

module.exports = supabase;
