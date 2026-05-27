# FlexFit AI

FlexFit AI is a release-ready MVP for an adaptive AI fitness coach. It helps busy people stay consistent by changing workouts around real-life constraints: time, energy, soreness, equipment, gym crowding, missed days, and weak points.

## Tech Stack

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui-style local components
- Framer Motion animations
- Lucide React icons
- Supabase auth and database
- Stripe-ready pricing placeholder
- OpenAI-ready coach API placeholder
- Vercel-ready configuration

## Routes

- `/` landing page
- `/login`, `/signup`
- `/onboarding`
- `/dashboard`
- `/workout`
- `/form-coach`
- `/recovery`
- `/weak-points`
- `/history`
- `/coach`
- `/pricing`
- `/settings`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Add Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the Supabase schema in the Supabase SQL editor:

```sql
-- See supabase/schema.sql
```

5. Start the dev server:

```bash
npm run dev
```

The app supports demo mode when Supabase env vars are not present, so the UI can be reviewed before backend setup.

## Supabase

The schema is in `supabase/schema.sql` and includes:

- `profiles`
- `onboarding_answers`
- `user_fitness_profiles`
- `workouts`
- `workout_exercises`
- `workout_logs`
- `form_checks`
- `daily_ai_messages`

Row-level security is enabled so users can only access their own data.

If your project already has the older `daily_coach_messages` table or a partial `daily_ai_messages` table, run `supabase/daily_ai_messages_migration.sql` in the Supabase SQL Editor to align the daily dashboard coach API with the expected schema.

For the NOVYRA onboarding, guided tutorial, and new-user checklist, run `supabase/user_fitness_profiles_migration.sql` if your Supabase project was created before this table existed. The full `supabase/schema.sql` also includes this table and RLS policies for fresh setups.

If Strength PR saving shows `public.pr_history` missing from the schema cache, run `supabase/pr_history_migration.sql` in the Supabase SQL Editor. It creates the `pr_history` table, adds RLS policies, and aligns the unique key with the app's `user_id + lift + date` upsert behavior.

### Storage Buckets

Create the following Supabase Storage buckets before using uploads:

- `avatars`
- `form-videos` exactly. The app uploads Form Coach videos to this exact bucket name.

The full setup SQL in `supabase/schema.sql` creates the `form-videos` bucket with:

- private access
- 50MB file size limit
- allowed video MIME types
- storage policies so authenticated users can only read, upload, update, and delete objects inside their own `{userId}/...` folder

Form Coach stores videos at:

```text
{userId}/{timestamp}-{exercise}.{extension}
```

The first folder must be the authenticated Supabase user id because the `form-videos` storage policies check `storage.foldername(name)[1] = auth.uid()`.

The saved `form_checks.video_url` value is the storage object path for the private video.

If Form Coach shows "Bucket not found", create the missing bucket by running the full `supabase/schema.sql` file again, or paste this bucket-only setup into the Supabase SQL Editor:

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'form-videos',
  'form-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists form_videos_select_own on storage.objects;
create policy form_videos_select_own
on storage.objects
for select
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_insert_own on storage.objects;
create policy form_videos_insert_own
on storage.objects
for insert
with check (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_update_own on storage.objects;
create policy form_videos_update_own
on storage.objects
for update
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_delete_own on storage.objects;
create policy form_videos_delete_own
on storage.objects
for delete
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

## OpenAI

The coach page calls `app/api/coach/route.ts`. Today it returns local mock responses from `lib/workout/coach.ts`. Add `OPENAI_API_KEY` and replace the placeholder block with an OpenAI Responses API call when live coaching is ready.

The dashboard calls `app/api/coach/daily/route.ts` once on load for Pro and Elite users. The route checks `profiles.plan_type`, reuses today's saved `daily_ai_messages` row when one exists, and only calls OpenAI when no message has been generated for the current day. Set `DEV_FAKE_AI=true` for local testing without calling OpenAI; this still saves the fake message to Supabase so the banner, dismiss button, and once-per-day behavior can be tested.

For local paid-feature testing, set `DEV_UNLOCK_PREMIUM=true`. This is server-side only and works only when `NODE_ENV !== "production"`; even if the variable is accidentally set on Vercel production, the bypass is ignored. When active, logged-in users are treated as Elite and the app shows a small "Dev Premium Enabled" badge.

The Form Coach page calls `app/api/form-coach/analyze/route.ts`. It extracts 3-5 browser-side JPEG key frames from the uploaded video, sends those frames plus the exercise type to the OpenAI Responses API, and expects structured JSON feedback.

Required:

```bash
OPENAI_API_KEY=
DEV_FAKE_AI=true
DEV_UNLOCK_PREMIUM=true
OPENAI_FORM_COACH_MODEL=gpt-4.1-mini
```

The route asks the model to analyze visible form issues only, avoid injury diagnosis, include uncertainty when the camera angle is poor, and ask the user to re-film when the set is unclear.

## Stripe Placeholder

The pricing page includes Free, Pro, and Elite tiers. Paid buttons intentionally display "Stripe checkout coming soon." Add Stripe checkout route handlers and set:

```bash
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID=
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Safety Disclaimer

FlexFit AI is not medical advice. Users should consult a physician before starting an exercise program, especially with medical conditions or injuries. Users should stop exercising and seek care if they experience chest pain, severe dizziness, unusual shortness of breath, or injury symptoms.
