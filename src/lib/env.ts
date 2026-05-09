import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  PRISMA_DATABASE_URL: z.string().url().optional(),
  POSTGRES_URL: z.string().url().optional(),
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),
  IGDB_WEBHOOK_SECRET: z.string().optional(),
  INGEST_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  WIKIPEDIA_USER_AGENT: z.string().optional(),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
  IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID,
  IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET,
  IGDB_WEBHOOK_SECRET: process.env.IGDB_WEBHOOK_SECRET,
  INGEST_API_KEY: process.env.INGEST_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  WIKIPEDIA_USER_AGENT: process.env.WIKIPEDIA_USER_AGENT,
});
