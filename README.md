# Game Delistings Tracker

Modern Next.js website for tracking recently delisted games, upcoming delistings, and a mortuary archive. Metadata/artwork can be synced from IGDB, while delisting events are stored in the project database.

## Local setup

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Copy environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Create database and generate Prisma client:
   ```powershell
   npm run prisma:push
   npm run prisma:generate
   npm run db:seed
   ```
4. Start development server:
   ```powershell
   npm run dev
   ```

## Docker setup

```powershell
docker compose up --build
```

## Vercel setup

Configure these environment variables in **Project Settings -> Environment Variables**:

- `DATABASE_URL` (managed Postgres preferred for production)
- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`
- `INGEST_API_KEY` (required to call the protected ingestion route)

### Deployment checklist

1. Push to `main`.
2. Ensure Vercel Build Command is `npm run build`.
3. Ensure Install Command is `npm install`.
4. Confirm `/api/health/db` returns `{ "ok": true }`.

## API routes

- `GET /api/home` -> homepage stats + featured events
- `GET /api/timeline?q=&platform=&sort=` -> timeline events with filters
- `GET /api/mortuary?q=` -> archived delisted games
- `GET /api/games/:id` -> game detail record
- `POST /api/ingest/igdb` -> ingest IGDB game records (`Authorization: Bearer <INGEST_API_KEY>`)
- `GET /api/health/db` -> database health check

## Notes

- IGDB provides game metadata/media, not a complete canonical delisting feed.
- Delisting events are intentionally stored locally for curation and reliability.
- Default local SQLite URL is `file:./dev.db`.
