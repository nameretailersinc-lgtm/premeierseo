import "server-only";
import { MongoClient, type Db } from "mongodb";

/*
 * One MongoClient per server process (cached on globalThis so dev hot-reloads don't open new pools).
 * Configure with MONGODB_URI (Atlas or self-hosted) and optionally MONGODB_DB (default "premierseo",
 * or the database named in the URI path).
 */

const g = globalThis as unknown as { __pssMongo?: Promise<MongoClient>; __pssMongoTestDb?: Db };

export function mongoConfigured(): boolean {
  return !!process.env.MONGODB_URI || !!g.__pssMongoTestDb;
}

export async function getDb(): Promise<Db> {
  if (g.__pssMongoTestDb) return g.__pssMongoTestDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!g.__pssMongo) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000, appName: "premierseo-web" });
    g.__pssMongo = client.connect().catch((e) => {
      g.__pssMongo = undefined; // allow a retry on the next request
      throw e;
    });
  }
  const client = await g.__pssMongo;
  const fromUri = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]+)/.exec(uri)?.[1];
  return client.db(process.env.MONGODB_DB || (fromUri ? decodeURIComponent(fromUri) : "premierseo"));
}

/** Test hook: run the store against a stand-in Db. */
export function __setTestDb(db: Db | undefined) {
  g.__pssMongoTestDb = db;
}
