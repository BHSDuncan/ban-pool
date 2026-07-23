# Captain Jack - Ban Pool

A dark-mode SvelteKit application for managing a friendly "ban pool" at the local bar. Guests can browse the public calendar and past winners, while a protected admin area lets Captain Jack schedule participants and log official bans.

## Features
- **Public calendar** with month navigation showing who claimed each date.
- **Winners archive** with sortable, paginated history (10/20/50 per page) and explicit "No winner" entries.
- **Secure admin area** (30‑minute sessions) for:
  - assigning one participant per future date, with edit/delete controls,
  - protecting past dates from changes,
  - declaring new bans using the BAN! workflow (must be after the prior ban),
  - automatic pool reset for all dates up to the ban date.
- **MongoDB Atlas** backed storage using `MONGODB_URI` + `MONGODB_DATABASE` environment variables.
- Pirate-inspired dark theme and navigation links available everywhere.

## Getting started
1. Use a supported Node.js runtime (`^20.19.0` or `>=22.12.0`).
   With `nvm`:
   ```bash
   nvm install
   nvm use
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Set required environment variables in `.env` (or your deployment target):
   ```bash
   # Database names inside your MongoDB project (kept separate from the URI).
   # These let you share one MongoDB project/cluster while still separating env data.
   MONGODB_DATABASE_DEV="captain-jack-dev"
   MONGODB_DATABASE_PROD="captain-jack-prod"
   # Optional shared fallback if you prefer a single database name:
   MONGODB_DATABASE="captain-jack"
   # Connection strings should point to the project/cluster only (no /<db> suffix).
   # Development DB (used locally). Falls back to MONGODB_URI.
   MONGODB_URI_DEV="your mongodb connection string for dev"
   # Production DB (used in deploys). Falls back to MONGODB_URI.
   MONGODB_URI_PROD="your mongodb connection string for production"
   # Optional shared fallback if you prefer a single connection string:
   MONGODB_URI="shared connection string used when *_DEV/PROD unset"
   ADMIN_USERNAME="captain-jack"          # optional – defaults shown
   ADMIN_PASSWORD="ban-parrot"            # optional plain-text fallback
   # or use a scrypt hash instead of ADMIN_PASSWORD:
   # ADMIN_PASSWORD_HASH="<salt>:<hash>"
   ```
   To generate a scrypt hash you can run:
   ```bash
   node -e "const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync(process.argv[1], salt, 64).toString('hex'); console.log(`${salt}:${hash}`)" 'your-secret'
   ```
   (Copy the printed `salt:hash` value into `ADMIN_PASSWORD_HASH`.)

Collections automatically use an environment prefix (`dev_` locally, `prod_` in production), so both environments can safely share the same MongoDB database without overlapping documents.
4. Run the dev server
   ```bash
   npm run dev -- --open
   ```

### Resetting demo data
To wipe winners/bans and seed recent participants (last 2 weeks ending yesterday), run:

```bash
npm run seed:data
```

The script loads credentials from `.env.local` via `node --env-file=.env.local`, so ensure that file exists before running it.

## Testing & linting
- `npm run check` – type-checks the project via `svelte-check`.
- `npm run build` – creates a production build, useful before deploying (e.g., to Vercel).

## Deployment
The project uses `@sveltejs/adapter-auto`, so it works locally and on platforms like Vercel/Netlify without extra config. Remember to set `MONGODB_URI`, `MONGODB_DATABASE`, `ADMIN_USERNAME`, and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` in the deployment environment.

### Migrating production ban records

The optional ban-detail fields are additive, but an idempotent migration is included so legacy
production records have the same explicit shape. From a Vercel-linked checkout with the Vercel CLI
installed and authenticated, run:

```bash
npm run db:migrate:production
```

The command uses `vercel env run -e production` to inject the linked project's production
environment variables directly into the migration process. It does not create or require a local
production environment file.

The script only updates documents in `prod_winners` that are missing one or more of the new fields.
It can be run again safely.
