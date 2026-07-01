import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DashboardDataset } from "@/lib/types";
import { parseWorkbookBuffer } from "@/lib/workbook/parser";

export const MASTER_FILE_NAME = "New Product Master_.xlsx";

export function getMasterFilePath() {
  return join(process.cwd(), MASTER_FILE_NAME);
}

/** Primary sheet master on disk — `New Product Master_.xlsx` at repo root. */
export function loadMasterDatasetFromDisk(): DashboardDataset | null {
  const path = getMasterFilePath();
  if (!existsSync(path)) return null;

  const file = readFileSync(path);
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  return parseWorkbookBuffer(buffer, MASTER_FILE_NAME);
}

export function isMasterFileOnDisk() {
  return existsSync(getMasterFilePath());
}
