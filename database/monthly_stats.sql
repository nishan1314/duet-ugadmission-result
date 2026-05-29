-- Create the monthly_stats table to store aggregated logs
CREATE TABLE IF NOT EXISTS public.monthly_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year text NOT NULL UNIQUE, -- Format: YYYY-MM
    total_visitors integer DEFAULT 0,
    total_searches integer DEFAULT 0,
    successful_searches integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_stats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for everyone
CREATE POLICY "Allow read access for all"
ON public.monthly_stats FOR SELECT
TO public
USING (true);

-- Create policy to allow insert/update for service role only (the API uses service role)
-- Note: The anon key shouldn't be able to insert/update, but if your setup relies on anon, 
-- you might want to adjust this. For an API route, using the service role key is recommended.
CREATE POLICY "Allow full access for service role"
ON public.monthly_stats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
