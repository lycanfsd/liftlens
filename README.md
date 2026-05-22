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
- `workouts`
- `workout_exercises`
- `workout_logs`

Row-level security is enabled so users can only access their own data.

## OpenAI Placeholder

The coach page calls `app/api/coach/route.ts`. Today it returns local mock responses from `lib/workout/coach.ts`. Add `OPENAI_API_KEY` and replace the placeholder block with an OpenAI Responses API call when live coaching is ready.

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
