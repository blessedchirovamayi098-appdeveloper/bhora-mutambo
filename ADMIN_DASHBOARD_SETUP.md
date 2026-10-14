# Admin dashboard setup

## What changed
- Replaced the demo Admin Login response with Supabase email/password authentication.
- After sign-in, the app checks for a matching row in `public.admin_users` before showing the dashboard.
- Added admin navigation for Overview, Clubs, Players & roster, Player profiles, Matches, Match events, League standings, Reports & exports, Discipline, and Administrators.
- Added live summary cards, calculated league standings based on completed matches, CSV downloads for management tables and reports, club dropdowns for roster/profile/suspension assignment, and administrator allowlist management.
- The dashboard reads real table columns from Supabase and provides search, refresh, create, edit, and delete controls when the table schema supports them.
- Added `@supabase/supabase-js` to dependencies.

## 1. Configure environment variables
Create `.env.local` from `.env.example` and fill in the Supabase project URL and publishable/anon key from Supabase Project Settings → API. Never put a `service_role` or secret key in a `VITE_` variable or browser code.

## 2. Enable authentication
In Supabase → Authentication → Providers, enable Email. Create the administrator account under Authentication → Users, or use the configured sign-up process. The website does not create admin accounts itself.

## 3. Authorize the administrator
The current code expects `public.admin_users.user_id` to equal the authenticated user's UUID. Check the actual `admin_users` columns in Table Editor. If the table uses a different column (for example `id` or `auth_user_id`), update the `.eq("user_id", user.id)` line in `src/App.jsx` to the correct column. Add a row for each authorized admin. Do not authorize users based only on a client-side email comparison.

## 4. Row Level Security
Keep RLS enabled. Create policies that allow authenticated, authorized administrators to select/insert/update/delete the tables managed by this dashboard. Do not disable RLS or expose a service-role key to make the UI work. The `admin_users` lookup also needs a safe policy that allows a signed-in user to verify only their own admin row.

## 5. Dashboard behavior and schema notes
The table manager uses actual returned columns and can edit records with an `id` or `uuid` primary-key column. If a table is empty, the dashboard cannot infer its columns through a normal browser query; add a sample row through Supabase Table Editor first or define a table-specific form. Foreign keys must reference existing club/player/match IDs. Delete actions are permanent and ask for confirmation.

## 6. Run locally
```bash
npm install
npm run dev
```

After changing `.env.local`, restart the Vite server. Before deployment, add the same two public environment variables in the hosting provider's environment settings and rebuild/redeploy.

## Club Management

The Admin Dashboard includes a dedicated **Club Management** section backed by `public.clubs`.

- Add clubs with a required name, short name, URL-friendly slug, and description.
- Edit club details without exposing the database ID or creation timestamp in the form.
- Search the club list and refresh it from Supabase.
- Delete is confirmed first. Supabase foreign-key constraints may block deleting clubs that are referenced by registrations, player profiles, standings, or fixtures; in that case, edit the club instead of removing linked records.
- The form can create a club even when the `clubs` table has no existing rows, because it uses the schema supplied for this project.

Required columns in `public.clubs`: `id` (UUID primary key), `name`, `slug`, `short_name`, `description`, and `created_at`. Keep RLS enabled and grant insert/update/delete only to authenticated users verified as administrators.


## New dashboard features and important limits

- **Overview:** fetches current records from clubs, roster, profiles, registrations, matches, events, suspensions, and administrators. If RLS blocks a table query, that table's summary can show zero; check permissions and the browser console.
- **League standings:** calculates points (3 for a win, 1 for a draw), played, W/D/L, goals for/against and goal difference in the browser from `clubs` and `matches`. It includes matches with a status of `completed`, `complete`, `finished`, `full time`, `full-time`, or `ft`, provided both scores are present. It does not write results to `club_standings`; persistent database standings and public-page integration are a separate step.
- **Reports:** CSV exports are generated in the browser from rows currently loaded from Supabase.
- **Squad management:** `approved_roster` remains the source for roster entries. Club selection uses the club UUID; foreign keys must reference existing rows.
- **Match events and suspensions:** these are record-management screens, not automatic discipline rules. Event and suspension fields must match the required columns in the existing schema.
- **Administrators:** `admin_users` only has `user_id`, `display_name`, and `created_at` in the supplied schema. This UI manages the allowlist, not Auth account creation or granular roles. For granular permissions, add a roles/permissions schema and enforce it with RLS policies. Never place a Supabase service-role key in frontend code.

## Club profiles and lineups

- The public Clubs directory now opens a profile with Overview, Players & squad, Coaches & referees, Matches & stats, and Discipline sections.
- Club profiles read the existing `clubs`, `approved_roster`, `approved_player_profiles`, `registrations`, `matches`, `match_lineups`, `match_events`, and `suspensions` tables where available under current RLS policies.
- The admin sidebar includes **Lineups & player stats**. It records player-level match rows, including starting XI, shirt number, position, minutes, goals, assists, cards, substitution minutes, clean sheets, and performance notes when those columns exist in `match_lineups`.
- The public match centre and league table use Supabase match records when readable. Club profiles show match reports, lineup/bench details, and the event timeline when corresponding records are available. Empty or inaccessible tables display a notice rather than fabricated official statistics.
- Coaches and referees are displayed from approved club-linked roster/profile/registration records whose role fields identify them as officials. If your schema stores coaches or referees in separate tables, add those tables to the `ClubProfile.jsx` query list after verifying their actual schema.

## Environment variable names

Vite only exposes frontend environment variables prefixed with `VITE_` by default. Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`; plain `SUPABASE_URL` / `SUPABASE_ANON_KEY` names will not be read by this frontend. Do not add a service-role key to any `VITE_` variable.
