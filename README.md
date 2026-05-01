# Zenko Whitelist

Pre-launch email collection app for Zenko closed beta.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3
- **Database:** Vercel Postgres
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client and apply migrations against your DATABASE_URL
npm run db:generate
npm run db:migrate:deploy

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

Copy `.env.example` to `.env` and fill in the required values before running the app.

## Sign-in providers

The waitlist supports four OAuth providers: Google, Twitch, X (Twitter), and Virtualeagues.

**Virtualeagues** uses OAuth 2 + PKCE (confidential client). To enable it locally:

1. Set `VL_CLIENT_ID`, `VL_CLIENT_SECRET`, and `VL_REDIRECT_URI` in `.env` (see `.env.example`).
2. Register your redirect URI in the VL OAuth app's allowed list — the match is exact (scheme, host, port, path). Add both your dev URL (`http://localhost:3000/auth/virtualeagues/callback`) and any deployed environments.

Each developer needs their own dev redirect URI registered, or shares a credential whose allowed list already includes `localhost:3000`.

## Features
- Email collection form
- Game selection (League of Legends, Valorant, Overwatch 2)
- Responsive design
- PostgreSQL database integration (coming soon)
- Admin dashboard for approvals (coming soon)

## Deployment
Automatically deploys to Vercel on push to `main` branch.
