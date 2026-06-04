import assert from "node:assert/strict";

const originalDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;

try {
  const dbClient = await import("../lib/db/client.ts");

  assert.equal(typeof dbClient.createDbClient, "function");
  assert.equal(typeof dbClient.getDb, "function");
  assert.equal(typeof dbClient.closeDbClient, "function");

  assert.throws(
    () => dbClient.createDbClient(),
    /DATABASE_URL is required when creating the PostgreSQL database client/,
  );
  assert.throws(
    () => dbClient.getDb(),
    /DATABASE_URL is required when creating the PostgreSQL database client/,
  );

  console.log("DB client import check passed without DATABASE_URL.");
} finally {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}
