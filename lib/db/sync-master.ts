import type { DashboardDataset, ProductRecord } from "@/lib/types";

import { sanitizeProductForMongo } from "@/lib/db/sanitize-for-mongo";
import { COLLECTIONS, ensureMongoIndexes, getMongoDb, isMongoConfigured } from "@/lib/db/mongo";

export type MongoProductDoc = ProductRecord & {
  workbookName: string;
  updatedAt: Date;
  formulaText: string;
  productExplanation: string;
  category: string;
};

export async function syncMasterDatasetToMongo(dataset: DashboardDataset) {
  if (!isMongoConfigured()) return { ok: false, reason: "MONGODB_URI not set" as const };

  const db = await getMongoDb();
  if (!db) return { ok: false, reason: "db_unavailable" as const };

  await ensureMongoIndexes();

  const now = new Date();
  const products = db.collection<MongoProductDoc>(COLLECTIONS.products);

  const ops = dataset.products.map((product) => {
    const doc = sanitizeProductForMongo(product);
    return {
      updateOne: {
        filter: { rowId: doc.rowId },
        update: {
          $set: {
            ...doc,
            workbookName: dataset.workbookName,
            updatedAt: now,
            formulaText: doc.formulaText ?? "",
            productExplanation: String(
              doc.raw["Product Explanation"] ?? doc.raw["Product explanation"] ?? "",
            ),
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await products.bulkWrite(ops, { ordered: false });
  }

  await db.collection(COLLECTIONS.masterUploads).insertOne({
    workbookName: dataset.workbookName,
    productCount: dataset.products.length,
    uploadedAt: now,
    formulaCount: dataset.formulaCatalog.length,
  });

  return { ok: true as const, productCount: dataset.products.length };
}

export async function loadProductsFromMongo(): Promise<ProductRecord[] | null> {
  if (!isMongoConfigured()) return null;
  const db = await getMongoDb();
  if (!db) return null;
  const docs = await db.collection<MongoProductDoc>(COLLECTIONS.products).find({}).toArray();
  return docs.map(({ workbookName: _w, updatedAt: _u, ...p }) => p as ProductRecord);
}
