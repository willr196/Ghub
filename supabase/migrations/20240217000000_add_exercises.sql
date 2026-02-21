
-- Required for gin_trgm_ops index on exercise name search
create extension if not exists pg_trgm;

-- Exercises table for the global library
create table if not exists public.exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  slug text not null unique,
  category text, -- e.g. Chest, Back
  subcategory text, -- e.g. Presses, Flyes
  description text,
  equipment text, -- e.g. Barbell, Dumbbell
  difficulty text, -- e.g. Beginner, Intermediate
  instructions jsonb, -- Array of steps
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.exercises enable row level security;

-- Policies
drop policy if exists "Anyone can view exercises" on public.exercises;
create policy "Anyone can view exercises" on public.exercises
  for select using (true);

-- Search index
create index if not exists exercises_name_trgm_idx on public.exercises using gin (name gin_trgm_ops);
create index if not exists exercises_category_idx on public.exercises (category);
