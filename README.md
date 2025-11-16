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
- **MongoDB Atlas** backed storage using the `MONGODB_URI` environment variable.
- Pirate-inspired dark theme and navigation links available everywhere.

## Getting started
1. Install dependencies
   ```bash
   npm install
   ```
2. Set required environment variables in `.env` (or your deployment target):
   ```bash
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
3. Run the dev server
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
The project uses `@sveltejs/adapter-auto`, so it works locally and on platforms like Vercel/Netlify without extra config. Remember to set `MONGODB_URI`, `ADMIN_USERNAME`, and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` in the deployment environment.
