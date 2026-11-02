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

The Express API is exposed as a serverless function in the same Next.js/Vercel project. Production requests use the same-origin `/api` path; they never call a visitor's `localhost`.

1. In the Vercel project serving `loansathi-ruddy.vercel.app`, set the **Root Directory** to `web`.
2. In **Settings → Environment Variables**, set `MONGO_URI` to the MongoDB Atlas connection string for the database that contains the imported loans.
3. Set `SESSION_SECRET` to a new random value of at least 32 characters. Keep it private.
4. If the users collection is empty, also set `ADMIN_USERNAME`, `ADMIN_NAME`, and `ADMIN_PASSWORD` to create the first admin. For an existing admin account, retain its existing MongoDB password; the environment password does not reset an existing user.
5. Apply the variables to Production and Preview, then redeploy. Do not set `NEXT_PUBLIC_API_URL` to a localhost or Render URL for this same-origin setup.
6. Verify `https://loansathi-ruddy.vercel.app/api/health` returns `{"status":"ok"}`, then sign in.

The `.env.local` file is local-only and is not published to GitHub. Copy the needed database and admin settings into Vercel's encrypted environment-variable settings; never commit them.

## Move the existing PHP data to MongoDB

The importer reads `data/loans.sqlite` and imports only loan accounts and repayment history. It deliberately refuses to run if the destination already contains loans or payments, preventing accidental duplicates. Set `SQLITE_PATH` to use a different SQLite file if needed, then run:

```sh
npm run migrate:sqlite
```

The importer uses Node's built-in SQLite reader (Node 22 or newer). Existing PHP user accounts and session settings are not imported; create the initial administrator through the environment variables above and configure session timeouts in Security settings.

## Structure

- `web/` — Next.js UI, Vercel API function, and shared Express/Mongoose backend
- `api/` — local Express server entry point and SQLite importer
