# Google OAuth setup (agent app)

## What the app does
- **Continue with Google** on Login / Register → Supabase Google provider
- New Google users go to **Complete profile** (phones + working pin only)
- If either phone already exists → blocked → asked to **sign in** instead
- Existing password users: **Profile → Sign-in → Connect Google** (same email)
- Admin dashboard stays email/password

## Supabase Dashboard
1. Authentication → Providers → **Google** → Enable
2. Paste Google Cloud **Web** Client ID + Client Secret
3. Authentication → URL Configuration → Redirect URLs add:
   - `wamapps://google-auth`  ← primary (thin route, avoids Get Started dump)
   - `wamapps://auth/callback` ← legacy, keep if already added
4. Prefer **manual identity linking** so Google does not silently merge mismatched accounts; the app links via Profile.

## Native modules
Google auth uses `expo-web-browser` + `expo-linking` only (no `expo-auth-session` / `expo-crypto`), so it works on your current dev client without a native rebuild for ExpoCrypto.

## Google Cloud Console
1. Create OAuth client type **Web application** (used by Supabase)
2. Authorized redirect URI = Supabase callback:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. (Optional) Android / iOS clients if you later switch to native Google Sign-In SDK

## Database
Apply migration:
`admin-dashboard/supabase/migrations/20260915180000_agent_phone_taken_and_google_signup.sql`

Provides:
- `normalize_ke_phone`
- `agent_phones_taken` (RPC used by the app)
- `handle_new_user` skips empty-phone Google signups

## Test checklist
1. New Google account → complete profile → pending agent
2. Same phones again with different Google → login message, no second agent
3. Existing email/password agent → Connect Google in Profile → next login works with Google
4. Google with email that already has password (without linking) → message to sign in with password first
