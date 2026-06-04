import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

// Direct Postgres connection for trusted server-side reads/queries.
// NOTE: connects as the database owner — RLS is NOT applied here. Use this
// only for public/aggregate reads or admin work; for user-scoped access go
// through the RLS-enforced Supabase server client instead.
const connectionString = process.env.DATABASE_URL!

const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>
}

const client =
  globalForDb.__pg ?? postgres(connectionString, { prepare: false })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pg = client
}

export const db = drizzle(client, { schema })
