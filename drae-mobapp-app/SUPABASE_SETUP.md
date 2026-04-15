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

## 4) Storage bucket for report photos / audio
- `supabase/schema.sql` (and migration `20260415140000_storage_incident_evidence.sql`) creates bucket **`incident-evidence`**, marks it **public**, and adds **RLS policies** so the app can upload.
- If you created the bucket manually before, run the migration or the storage section of `schema.sql` once so **insert** policies exist (otherwise uploads fail and reports go offline).

## 5) Run the app
```
npm start
```

If Supabase env is missing, app will still run with local fallback data.
