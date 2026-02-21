# 💪 GHUB - Personal Fitness & Wellness Hub

A comprehensive fitness tracking web app built as a Christmas gift! Track workouts, measurements, daily wellness, sobriety milestones, recipes, and more.

## Features

- 📊 **Dashboard** - Overview of all stats, streaks, and progress
- 🏋️ **Workout Tracker** - Log workouts with type, duration, and calories
- 📏 **Measurements** - Track weight and body measurements over time
- ☀️ **Daily Log** - Water intake, sleep, mood, and energy tracking
- 🎯 **Goals** - Set and track fitness goals with visual progress
- 🌟 **Sobriety Tracker** - Days alcohol/smoke-free with health benefit milestones
- 🍳 **Recipes** - Save and share healtgit hy recipes
- 📝 **Blog** - Journal your fitness journey (public posts)
- 📸 **Gallery** - Document progress with photos/videos
- 🔬 **Science** - Evidence-based fitness information
- 🛍️ **Merch** - Product recommendations

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel

---

## 🚀 Deployment Guide (Step-by-Step)

### Step 1: Create a Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `ghub` (or anything you like)
   - **Database Password**: Generate a strong one and **save it somewhere**
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait ~2 minutes

### Step 2: Set Up the Database

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the ENTIRE contents of `supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click **"Run"** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - that's good!

**If you already ran the schema previously**, add these new columns to support onboarding state:
```sql
alter table public.profiles
  add column if not exists onboarding_completed boolean default false,
  add column if not exists onboarding_hide_until timestamp with time zone;
```

**If you already ran the schema previously**, add the auth trigger to auto-create profiles:
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

**RLS note:** the client-side onboarding fallback uses an upsert on `profiles`. If inserts fail, ensure this policy exists:
```sql
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
```

### Step 3: Get Your Supabase Keys

1. Go to **Settings** → **API** (left sidebar)
2. You'll need three values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys", keep this secret)
3. Keep this tab open, you'll need these soon

### Step 4: Set Up GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click **"+"** → **"New repository"**
3. Name it `ghub` (or whatever you like)
4. Keep it **Private** if you want
5. Click **"Create repository"**
6. Upload all the files from this project to the repository

**Option A: Upload via GitHub website**
- Click "uploading an existing file"
- Drag the entire `ghub` folder contents
- Commit the changes

**Option B: Using Git commands**
```bash
cd ghub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ghub.git
git push -u origin main
```

### Step 5: Deploy to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Find and select your `ghub` repository
4. Before deploying, click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (server-only) |
| `SECRET_CODE` | `GHUB_CHRISTMAS_2024` (or change this!) |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL (for metadata and sitemap) |

5. Click **"Deploy"**
6. Wait 1-2 minutes for the build
7. 🎉 Your site is live!

### Step 6: Configure Supabase Auth

1. Back in Supabase, go to **Authentication** → **Providers** → **Email**
2. Turn off open self-signup (`Enable Email Signup` / `Allow new users to sign up`, wording depends on UI version).
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to your Vercel URL (e.g., `https://ghub-xxx.vercel.app`)
5. Under **Redirect URLs**, add:
   - `https://ghub-xxx.vercel.app/**`
   - `http://localhost:3000/**` (for local development)

---

## 🎁 Giving It as a Gift

When you give this to your sister:

1. Share the website URL
2. Give her the **secret registration code** (default: `GHUB_CHRISTMAS_2024`)
3. She goes to the site → clicks "Admin Login" → "Create an account"
4. Enters the secret code + her email + password
5. She's in! 🎄

### Changing the Secret Code

Before deployment, change `SECRET_CODE` in Vercel to something personal like:
- `MERRY_CHRISTMAS_SIS`
- `GHUB_FOR_[HER_NAME]`
- Any phrase you both would know

---

## 🛠️ Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ghub.git
cd ghub

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## 📚 Team Workflow (Run, Update, Deploy)

Use this section as the default operating guide for anyone maintaining this project.

### 1) First-time setup

```bash
git clone https://github.com/YOUR_USERNAME/ghub.git
cd ghub
npm install
cp .env.example .env.local
```

Then set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SECRET_CODE`, and `NEXT_PUBLIC_SITE_URL` in `.env.local`.

### 2) How to run locally

```bash
npm run dev
```

- App runs at `http://localhost:3000`
- Use `npm run lint` before pushing
- Use `npm run build` to verify production build locally

### 3) Daily update workflow

```bash
# Start from latest main
git checkout main
git pull origin main

# Create a feature branch
git checkout -b feature/short-description

# Work, then validate
npm run lint
npm run build

# Commit and push
git add .
git commit -m "Describe change"
git push -u origin feature/short-description
```

Open a Pull Request to `main` and merge after checks pass.

### 4) Updating database schema (Supabase)

When `supabase/schema.sql` changes:

1. Open Supabase SQL Editor
2. Apply only the new SQL changes (or run updated schema in a clean database)
3. Confirm tables, policies, and triggers still work
4. Test registration/login and one write action (example: adding a workout)

Keep schema changes and app code in the same PR whenever possible.

### 5) Deploy workflow (Vercel)

1. Merge approved PR into `main`
2. Vercel auto-deploys from `main`
3. Verify deployment health:
   - Site loads
   - Auth works (register/login)
   - One protected page loads (dashboard)
4. If environment variables changed, update them in Vercel Project Settings before redeploying

### 6) How to update dependencies safely

```bash
npm outdated
npm update
npm run lint
npm run build
```

For major version bumps, update one package at a time and test before merging.

---

## 🔒 Privacy

- **Private data** (workouts, measurements, daily logs, goals, sobriety): Only visible to logged-in user
- **Public data** (blog posts, recipes, gallery): Visible to anyone (can be toggled per item)
- **Science & Merch pages**: Static content, no personal data

---

## ❤️ Made with Love

Built as a Christmas 2024 gift. Enjoy your fitness journey!
