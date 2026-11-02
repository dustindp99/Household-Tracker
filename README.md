# Household Tracker

A shared inventory app for iOS and Android, built with Expo and Supabase.

## Setup

You need Node 24 (see `.nvmrc`) and Docker.

```sh
npm install
npm run db:start               # starts local Supabase in Docker
cp .env.example .env.local     # then add the publishable key from `npx supabase status`
npm start                      # scan the QR code with Expo Go
```

On a physical phone, `127.0.0.1` points at the phone itself. In `.env.local`, replace it with this computer's LAN IP address, and restart Expo.

Local Supabase doesn't send real email. Read sign-in codes at http://127.0.0.1:54324.

Run `npm run db:stop` when you're done. Your local data is kept.

## Checks

```sh
npm run typecheck
npm test                       # unit and component tests
npm run test:integration       # real flows against local Supabase (needs db:start)
npx supabase test db           # database permission tests (needs db:start)
```

To apply new database migrations without losing local data, run `npx supabase migration up --local`.

Don't put tests in `src/app`: Expo Router treats every file there as a screen.
