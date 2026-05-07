import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),
  IGDB_WEBHOOK_SECRET: z.string().optional(),
  INGEST_API_KEY: z.string().optional(),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID,
  IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET,
  IGDB_WEBHOOK_SECRET: process.env.IGDB_WEBHOOK_SECRET,
  INGEST_API_KEY: process.env.INGEST_API_KEY,
});
