-- Performance indexes for common GHUB query patterns

-- Workouts
create index if not exists workouts_user_date_idx
  on public.workouts (user_id, date desc);
create index if not exists workouts_user_type_created_idx
  on public.workouts (user_id, type, created_at desc);

-- Measurements
create index if not exists measurements_user_date_idx
  on public.measurements (user_id, date desc);

-- Goals
create index if not exists goals_user_created_idx
  on public.goals (user_id, created_at desc);
create index if not exists goals_user_completed_created_idx
  on public.goals (user_id, completed, created_at desc);

-- Sobriety
create index if not exists sobriety_user_active_start_idx
  on public.sobriety (user_id, is_active, start_date desc);

-- Workout templates
create index if not exists workout_library_user_created_idx
  on public.workout_library (user_id, created_at desc);

-- Recipes
create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);
create index if not exists recipes_public_created_idx
  on public.recipes (is_public, created_at desc);

-- Blog posts
create index if not exists blog_posts_user_created_idx
  on public.blog_posts (user_id, created_at desc);
create index if not exists blog_posts_public_created_idx
  on public.blog_posts (is_public, created_at desc);

-- Gallery
create index if not exists gallery_user_date_idx
  on public.gallery (user_id, date desc);
create index if not exists gallery_public_date_idx
  on public.gallery (is_public, date desc);

-- Travel
create index if not exists travel_user_date_visited_idx
  on public.travel (user_id, date_visited desc);
create index if not exists travel_public_date_visited_idx
  on public.travel (is_public, date_visited desc);
