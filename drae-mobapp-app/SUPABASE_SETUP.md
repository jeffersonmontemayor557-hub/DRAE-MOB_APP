# Supabase Setup

## 1) Create project
- Create a Supabase project at https://supabase.com/dashboard
- Copy your:
  - Project URL
  - anon public key

## 2) Add environment variables
Create a file named `.env` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Then restart Expo dev server after editing `.env`.

## 3) Apply SQL schema
- Open Supabase SQL Editor
- Run `supabase/schema.sql`

## 4) Create storage bucket for report photos
- Go to Storage
- Create bucket: `incident-evidence`
- For quick prototype testing, set bucket to public.

## 5) Run the app
```
npm start
```

If Supabase env is missing, app will still run with local fallback data.
