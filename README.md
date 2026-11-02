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

## Move the existing PHP data to MongoDB

The importer reads `data/loans.sqlite` and imports only loan accounts and repayment history. It deliberately refuses to run if the destination already contains loans or payments, preventing accidental duplicates. Set `SQLITE_PATH` to use a different SQLite file if needed, then run:

```sh
npm run migrate:sqlite
```

The importer uses Node's built-in SQLite reader (Node 22 or newer). Existing PHP user accounts and session settings are not imported; create the initial administrator through the environment variables above and configure session timeouts in Security settings.

## Structure

- `web/` — Next.js App Router UI
- `api/` — Express API, Mongoose models, MongoDB session store, and SQLite importer
