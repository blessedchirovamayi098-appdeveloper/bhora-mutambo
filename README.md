# Manav Rachna Football Club Management System

React + Vite + Supabase application. The original public football hub, registration experience, match centre, and admin sign-in have been preserved while adding a data-backed club profile experience and an expanded administration area.

## Start locally

1. Install Node.js (LTS recommended).
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the Supabase project URL and publishable/anon key. Do not use a service-role key in frontend code.
4. Run `npm install` and `npm run dev`.
5. Sign in through Admin Login with a Supabase Auth account authorized by a row in `public.admin_users`.

## Club profile features

The club directory loads `public.clubs` when accessible. Each club profile has Overview, Players & squad, Coaches & referees, Matches & stats, and Discipline sections. Data is read from the existing `approved_roster`, `approved_player_profiles`, `registrations`, `matches`, `match_events`, `match_lineups`, and `suspensions` tables where those tables are available and readable under Row Level Security. The public UI handles unavailable tables gracefully; verify column names and RLS policies in Supabase for full live data.

The public standings are calculated from completed match records with both full-time scores. Calculated standings are not written back to `club_standings`.

## Admin area

The dashboard includes Overview, Clubs, Players & roster, Player profiles, Matches, Match events, League standings, Reports & CSV exports, Discipline, and Administrators. Administrator authorization checks `public.admin_users.user_id` against the signed-in Supabase Auth UUID. RLS must remain enabled and policies must permit only authorized actions.

## Important security note

`.env.local` is intentionally excluded from this ZIP. Keep it local and never commit it. Only the Supabase URL and publishable/anon key belong in browser-side environment variables.
