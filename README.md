# CharacterCard.gg

Create collectible World of Warcraft character cards from live Mythic+, raid,
Raider.IO, Blizzard, and Warcraft Logs data.

## Features

- Realm-first character lookup
- Mythic+ and raid card modes
- Blizzard character render media when credentials are configured
- Raider.IO score, best keys, and raid progression
- Warcraft Logs parse summaries and rankings when credentials are configured
- PNG export from the browser
- Graceful fallback when optional external APIs are private or unavailable

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and add credentials for the optional data
sources:

```bash
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=
WARCRAFTLOGS_CLIENT_ID=
WARCRAFTLOGS_CLIENT_SECRET=
```

Raider.IO public data works without API keys.

## Verification

Run these before deploying:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

## Deploying To Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables from `.env.example` in Vercel project settings.
4. Add `charactercard.gg` as a Vercel domain.
5. Point the Porkbun DNS records to Vercel.

Vercel will build with `npm run build` and serve the app over HTTPS.
