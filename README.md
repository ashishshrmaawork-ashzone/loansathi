# Loan Sathi

Loan Sathi is a loan and EMI tracker built with a Next.js frontend, an Express API, and MongoDB.

## Requirements

- Node.js 20.9 or newer
- MongoDB (local or hosted)

## Run locally

1. Copy `.env.example` to `.env.local` and set `MONGO_URI`, a unique `SESSION_SECRET`, and a strong `ADMIN_PASSWORD`. The API and frontend also accept `.env` as a fallback.
2. Install dependencies with `npm install`.
3. Start the API and Next.js app with `npm run dev`.
4. Open <http://localhost:3000> and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

The first administrator is created on API startup only when the MongoDB users collection is empty. Later changes to the admin environment variables do not change an existing password. There is no public registration page.

## Deploy the live app

The Next.js site and Express API are separate services. A Vercel deployment serves the frontend; it cannot reach an API running on your computer at `localhost:4001`.

### Deploy the API to Render

1. In Render, create a **Blueprint** from this GitHub repository and approve the `render.yaml` configuration.
2. Set the prompted `MONGO_URI` to your MongoDB Atlas connection string. In Atlas, allow connections from your Render service's outbound IP addresses.
3. Set `ADMIN_USERNAME`, `ADMIN_NAME`, and `ADMIN_PASSWORD` for the first admin. Use the existing admin credentials if its MongoDB database was already initialized.
4. Wait for the Render service health check at `/api/health` to pass, then copy its public service URL, for example `https://loansathi-api.onrender.com`.

Render generates a `SESSION_SECRET` automatically. The configured `WEB_ORIGIN` allows the current Vercel deployment, `https://loansathi-ruddy.vercel.app`.

### Connect Vercel to the API

1. In Vercel, open the project serving `loansathi-ruddy.vercel.app`, then **Settings → Environment Variables**.
2. Set `NEXT_PUBLIC_API_URL` to the Render service URL followed by `/api`, for example `https://loansathi-api.onrender.com/api`.
3. Apply it to Production (and Preview if needed), then redeploy the Vercel project so the URL is included in the frontend build.

Production builds intentionally fail when `NEXT_PUBLIC_API_URL` is missing, instead of deploying a site that calls a visitor's localhost. Check `https://<render-service>/api/health` returns `{"status":"ok"}` before trying to sign in.

## Move the existing PHP data to MongoDB

The importer reads `data/loans.sqlite` and imports only loan accounts and repayment history. It deliberately refuses to run if the destination already contains loans or payments, preventing accidental duplicates. Set `SQLITE_PATH` to use a different SQLite file if needed, then run:

```sh
npm run migrate:sqlite
```

The importer uses Node's built-in SQLite reader (Node 22 or newer). Existing PHP user accounts and session settings are not imported; create the initial administrator through the environment variables above and configure session timeouts in Security settings.

## Structure

- `web/` — Next.js App Router UI
- `api/` — Express API, Mongoose models, MongoDB session store, and SQLite importer
