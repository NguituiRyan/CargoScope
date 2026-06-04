import { defineConfig } from "drizzle-kit"

// `generate` works without a DB connection; `migrate`/`push`/`studio`
// require DATABASE_URL (Supabase session/pooler connection string).
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
})
