# CO-LAB CONNECT Mobile — Session Handoff

**Date paused:** 2026-09-19
**Model used:** opencode/big-pickle (set in `~/.config/opencode/opencode.jsonc`)
**Branch:** main (pushed)

## What works right now
- Expo SDK 57 + TypeScript + Expo Router scaffold (`mobile-app/`), branded
  CO-LAB CONNECT (`com.colabconnect.app`, scheme `colabconnect://`).
- Secure auth against the REAL Flask backend: login / register / OTP verify /
  resend, JWT in `expo-secure-store`, role routing (customer / worker /
  society=cooperative_admin). No refresh endpoint on backend (not implemented).
- Customer: home, backend catalog + search, new request (expo-location
  picker), bookings list, booking detail (bill from backend financials,
  cancel, sandbox pay, star rating), disputes, notifications, profile.
- Worker: role home (pending/rating), jobs list, job detail with full
  status flow (en_route → service_started → completed), profile with
  earnings (backend payouts) + welfare enrollments, workforce offers
  accept/decline in Assigned Jobs.
- Society: home stats, requirements list, multi-type requirement composer
  with live worker-days summary, detail with progress + backend payout
  estimates, allocate-ready backend (society/federation allocate APIs).
- Security: `.env` gitignored (only `EXPO_PUBLIC_API_URL`), no service-role
  keys, token never logged, backend RBAC enforced + tested.
- `npx tsc --noEmit` status at pause: see session log (2 remaining errors are
  missing generated `expo-env.d.ts` / `.expo/types` — they appear after the
  first `expo start`; template files, not app code).

## Backend this app talks to (DO NOT rebuild)
- Flask API at `EXPO_PUBLIC_API_URL` (dev: `http://192.168.0.109:5000/api`).
- Real endpoints used: `/auth/*`, `/services/`, `/requests`, `/bookings`,
  `/payments`, `/ratings`, `/disputes`, `/notifications`, `/welfare`,
  `/workers/*`, `/society/workforce/*`, `/workforce/*`.
- Backend note: NO token-refresh endpoint; JWT lives 24h.

## Installed packages (SDK 57 aligned)
- expo-secure-store 57.0.4, expo-location 57.0.19,
  expo-image-picker 57.0.19, @expo/vector-icons 15.1.1
- `node_modules` was clean-reinstalled (OneDrive long-path breakage fixed
  via `cmd rmdir`). If installs act strange again, repeat that.

## Next session: continue here
1. `cd mobile-app` → `./node_modules/.bin/expo start` (generates
   `expo-env.d.ts`), then `tsc --noEmit` should go fully green.
2. Remaining app work: photo upload wiring (expo-image-picker installed,
   backend has no photo endpoint yet — needs smallest backend addition +
   test), push notifications (needs dev build — Expo Go can't do Android
   push), native maps (needs dev build; currently OSM deep-links).
3. EAS builds need: `eas login` (user's Expo account) → `eas init` →
   `eas build -p android --profile preview` (APK) → production AAB →
   iOS via EAS cloud (no Mac needed) → TestFlight.
4. E2E: run `mobile-app` flows against live backend with demo accounts
   (`customer@demo.com` / `worker@demo.com` / `coop@demo.com` /
   `CoLab!Demo2026`), same script as web video.
5. DO NOT: create 2nd DB, duplicate pricing/matching logic, commit `.env`.

## Open questions for user
- Expo account for EAS builds (email/org)?
- Production API URL for staging/prod profiles?
- Which backend photo endpoint design for service photos?
