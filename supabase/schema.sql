-- GHUB Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Profile table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  display_name text,
  avatar_url text,
  onboarding_completed boolean default false,
  onboarding_hide_until timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure onboarding columns exist on older installs
alter table public.profiles
  add column if not exists onboarding_completed boolean default false,
  add column if not exists onboarding_hide_until timestamp with time zone;

-- Auto-create profile rows when new auth users are created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, created_at, updated_at)
  values (new.id, new.email, split_part(new.email, '@', 1), now(), now())
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Workouts table
create table if not exists public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null,
  duration integer,
  calories integer,
  notes text,
  exercises jsonb,
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Measurements table
create table if not exists public.measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  weight decimal(5,2),
  chest decimal(5,2),
  waist decimal(5,2),
  hips decimal(5,2),
  arms decimal(5,2),
  thighs decimal(5,2),
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Log table
create table if not exists public.daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default current_date,
  water_intake integer default 0,
  sleep_hours decimal(3,1),
  sleep_quality integer,
  mood text,
  energy integer,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Goals table
create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target decimal(10,2) not null,
  current decimal(10,2) default 0,
  unit text,
  category text,
  completed boolean default false,
  target_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sobriety tracking table
create table if not exists public.sobriety (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  start_date date not null,
  is_active boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Recipes table
create table if not exists public.recipes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  category text,
  description text,
  ingredients jsonb,
  instructions text,
  calories integer,
  protein integer,
  carbs integer,
  fat integer,
  prep_time integer,
  cook_time integer,
  image_url text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Blog posts table
create table if not exists public.blog_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text,
  excerpt text,
  is_public boolean default true,
  published_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Media gallery table
create table if not exists public.gallery (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  url text not null,
  caption text,
  category text,
  is_public boolean default false,
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workout library table
create table if not exists public.workout_library (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  goal text not null default 'Muscle gain',
  muscle_group text,
  cardio_mode text,
  exercises jsonb not null,
  estimated_duration integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure workout_library classification columns exist on older installs
alter table public.workout_library
  add column if not exists goal text not null default 'Muscle gain',
  add column if not exists muscle_group text,
  add column if not exists cardio_mode text;

-- Travel table
create table if not exists public.travel (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  country text not null,
  city text not null,
  description text,
  highlights text,
  date_visited date,
  rating integer default 5 check (rating >= 1 and rating <= 5),
  would_return boolean default true,
  is_public boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row level security
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.measurements enable row level security;
alter table public.daily_logs enable row level security;
alter table public.goals enable row level security;
alter table public.sobriety enable row level security;
alter table public.recipes enable row level security;
alter table public.blog_posts enable row level security;
alter table public.gallery enable row level security;
alter table public.workout_library enable row level security;
alter table public.travel enable row level security;

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Workouts policies
drop policy if exists "Users can view own workouts" on public.workouts;
create policy "Users can view own workouts" on public.workouts
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own workouts" on public.workouts;
create policy "Users can insert own workouts" on public.workouts
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own workouts" on public.workouts;
create policy "Users can update own workouts" on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own workouts" on public.workouts;
create policy "Users can delete own workouts" on public.workouts
  for delete using (auth.uid() = user_id);

-- Measurements policies
drop policy if exists "Users can view own measurements" on public.measurements;
create policy "Users can view own measurements" on public.measurements
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own measurements" on public.measurements;
create policy "Users can insert own measurements" on public.measurements
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own measurements" on public.measurements;
create policy "Users can update own measurements" on public.measurements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own measurements" on public.measurements;
create policy "Users can delete own measurements" on public.measurements
  for delete using (auth.uid() = user_id);

-- Daily logs policies
drop policy if exists "Users can view own daily logs" on public.daily_logs;
create policy "Users can view own daily logs" on public.daily_logs
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own daily logs" on public.daily_logs;
create policy "Users can insert own daily logs" on public.daily_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own daily logs" on public.daily_logs;
create policy "Users can update own daily logs" on public.daily_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own daily logs" on public.daily_logs;
create policy "Users can delete own daily logs" on public.daily_logs
  for delete using (auth.uid() = user_id);

-- Goals policies
drop policy if exists "Users can view own goals" on public.goals;
create policy "Users can view own goals" on public.goals
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

-- Sobriety policies
drop policy if exists "Users can view own sobriety" on public.sobriety;
create policy "Users can view own sobriety" on public.sobriety
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own sobriety" on public.sobriety;
create policy "Users can insert own sobriety" on public.sobriety
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own sobriety" on public.sobriety;
create policy "Users can update own sobriety" on public.sobriety
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own sobriety" on public.sobriety;
create policy "Users can delete own sobriety" on public.sobriety
  for delete using (auth.uid() = user_id);

-- Recipes policies
drop policy if exists "Anyone can view public recipes" on public.recipes;
create policy "Anyone can view public recipes" on public.recipes
  for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users can insert own recipes" on public.recipes;
create policy "Users can insert own recipes" on public.recipes
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes" on public.recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes" on public.recipes
  for delete using (auth.uid() = user_id);

-- Blog posts policies
drop policy if exists "Anyone can view public blog posts" on public.blog_posts;
create policy "Anyone can view public blog posts" on public.blog_posts
  for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users can insert own blog posts" on public.blog_posts;
create policy "Users can insert own blog posts" on public.blog_posts
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own blog posts" on public.blog_posts;
create policy "Users can update own blog posts" on public.blog_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own blog posts" on public.blog_posts;
create policy "Users can delete own blog posts" on public.blog_posts
  for delete using (auth.uid() = user_id);

-- Gallery policies
drop policy if exists "Anyone can view public gallery items" on public.gallery;
create policy "Anyone can view public gallery items" on public.gallery
  for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users can insert own gallery items" on public.gallery;
create policy "Users can insert own gallery items" on public.gallery
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own gallery items" on public.gallery;
create policy "Users can update own gallery items" on public.gallery
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own gallery items" on public.gallery;
create policy "Users can delete own gallery items" on public.gallery
  for delete using (auth.uid() = user_id);

-- Workout library policies
drop policy if exists "Users can view own workout library" on public.workout_library;
create policy "Users can view own workout library" on public.workout_library
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own workout library" on public.workout_library;
create policy "Users can insert own workout library" on public.workout_library
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own workout library" on public.workout_library;
create policy "Users can update own workout library" on public.workout_library
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own workout library" on public.workout_library;
create policy "Users can delete own workout library" on public.workout_library
  for delete using (auth.uid() = user_id);

-- Travel policies
drop policy if exists "Anyone can view public travel entries" on public.travel;
create policy "Anyone can view public travel entries" on public.travel
  for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users can insert own travel entries" on public.travel;
create policy "Users can insert own travel entries" on public.travel
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own travel entries" on public.travel;
create policy "Users can update own travel entries" on public.travel
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own travel entries" on public.travel;
create policy "Users can delete own travel entries" on public.travel
  for delete using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_daily_logs_updated_at on public.daily_logs;
create trigger update_daily_logs_updated_at before update on public.daily_logs
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_blog_posts_updated_at on public.blog_posts;
create trigger update_blog_posts_updated_at before update on public.blog_posts
  for each row execute procedure public.update_updated_at_column();

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
