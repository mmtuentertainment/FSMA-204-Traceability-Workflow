import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema.ts";

const DATABASE_URL_NAME = "DATABASE_URL";

export type DbSchema = typeof schema;

export interface DbClientOptions {
  connectionString?: string;
  poolConfig?: Omit<PoolConfig, "connectionString">;
}

export interface DbClient {
  pool: Pool;
  db: ReturnType<typeof drizzle<DbSchema>>;
}

let cachedClient: DbClient | undefined;

function resolveConnectionString(connectionString?: string): string {
  const resolved = connectionString ?? process.env[DATABASE_URL_NAME];

  if (!resolved) {
    throw new Error(
      `${DATABASE_URL_NAME} is required when creating the PostgreSQL database client.`,
    );
  }

  return resolved;
}

export function createDbClient(options: DbClientOptions = {}): DbClient {
  const pool = new Pool({
    ...options.poolConfig,
    connectionString: resolveConnectionString(options.connectionString),
  });

  return {
    pool,
    db: drizzle({ client: pool, schema }),
  };
}

export function getDb(): DbClient {
  cachedClient ??= createDbClient();
  return cachedClient;
}

export async function closeDbClient(client = cachedClient): Promise<void> {
  if (!client) {
    return;
  }

  if (client === cachedClient) {
    cachedClient = undefined;
  }

  await client.pool.end();
}
