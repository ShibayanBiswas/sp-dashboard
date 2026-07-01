import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

import { isMongoConfigured, resolveMongoConfig } from "@/lib/db/mongo-config";

declare global {
  // eslint-disable-next-line no-var
  var __spMongoClient: MongoClient | undefined;
}

let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

const CLIENT_OPTIONS: MongoClientOptions = {
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
};

export { isMongoConfigured } from "@/lib/db/mongo-config";

export async function getMongoDb(): Promise<Db | null> {
  const config = resolveMongoConfig();
  if (!config) return null;

  if (!client) {
    client = global.__spMongoClient ?? new MongoClient(config.uri, CLIENT_OPTIONS);
    if (process.env.NODE_ENV !== "production") {
      global.__spMongoClient = client;
    }
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
  return client.db(config.dbName);
}

export async function pingMongo(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isMongoConfigured()) {
    return { ok: false, reason: "MONGODB_URI not set (copy .env.example → .env.local)" };
  }

  try {
    const db = await getMongoDb();
    if (!db) return { ok: false, reason: "Mongo client unavailable" };
    await db.command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/authentication failed|auth fail/i.test(message)) {
      return {
        ok: false,
        reason:
          "Authentication failed — check MONGODB_URI credentials or MONGODB_USER / MONGODB_PASSWORD / MONGODB_AUTH_SOURCE",
      };
    }
    if (/ECONNREFUSED|Server selection timed out|connect ECONNREFUSED/i.test(message)) {
      return {
        ok: false,
        reason:
          "Cannot reach MongoDB on 127.0.0.1:27017 — run: docker compose up -d (or set MONGODB_URI to your Atlas cluster)",
      };
    }
    return { ok: false, reason: message };
  }
}

export async function ensureMongoIndexes() {
  const db = await getMongoDb();
  if (!db) return;
  await Promise.all([
    db.collection(COLLECTIONS.products).createIndex({ rowId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.products).createIndex({ isin: 1 }),
    db.collection(COLLECTIONS.indexPrices).createIndex({ date: 1 }, { unique: true }),
    db.collection(COLLECTIONS.masterUploads).createIndex({ uploadedAt: -1 }),
  ]);
}

export const COLLECTIONS = {
  products: "products",
  indexPrices: "index_prices",
  masterUploads: "master_uploads",
} as const;
