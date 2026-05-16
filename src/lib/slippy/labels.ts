import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Slip } from "./model";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LABEL_WIDTH = 4;
const root = fileURLToPath(new URL("../../..", import.meta.url));
const registryPath = path.join(root, "src", "data", "slip-labels.json");

interface SlipLabelRegistry {
  labels: Record<string, string>;
}

export async function assignSlipLabels(slips: Slip[]): Promise<void> {
  const registry = await readRegistry();
  const labels = { ...registry.labels };
  const used = new Set(Object.values(labels));
  let next = nextLabelValue(used);
  let changed = false;

  for (const slip of [...slips].sort((left, right) => left.key.localeCompare(right.key))) {
    if (!labels[slip.key]) {
      while (used.has(encodeLabel(next))) next += 1;
      labels[slip.key] = encodeLabel(next);
      used.add(labels[slip.key]);
      next += 1;
      changed = true;
    }

    slip.label = labels[slip.key];
  }

  if (changed) {
    await writeRegistry({ labels: sortLabels(labels) });
  }
}

async function readRegistry(): Promise<SlipLabelRegistry> {
  try {
    const parsed = JSON.parse(await readFile(registryPath, "utf8")) as Partial<SlipLabelRegistry>;
    return {
      labels: isRecord(parsed.labels) ? parsed.labels : {},
    };
  } catch {
    return { labels: {} };
  }
}

async function writeRegistry(registry: SlipLabelRegistry): Promise<void> {
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function nextLabelValue(labels: Set<string>): number {
  let max = 0;
  for (const label of labels) {
    const value = decodeLabel(label);
    if (value !== undefined) max = Math.max(max, value);
  }
  return max + 1;
}

function encodeLabel(value: number): string {
  let remaining = value;
  let encoded = "";

  do {
    encoded = CROCKFORD[remaining % CROCKFORD.length] + encoded;
    remaining = Math.floor(remaining / CROCKFORD.length);
  } while (remaining > 0);

  return encoded.padStart(LABEL_WIDTH, "0");
}

function decodeLabel(label: string): number | undefined {
  let value = 0;
  for (const char of label) {
    const digit = CROCKFORD.indexOf(char);
    if (digit < 0) return undefined;
    value = value * CROCKFORD.length + digit;
  }
  return value;
}

function sortLabels(labels: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).sort(([leftKey, leftLabel], [rightKey, rightLabel]) => {
      const leftValue = decodeLabel(leftLabel) ?? Number.MAX_SAFE_INTEGER;
      const rightValue = decodeLabel(rightLabel) ?? Number.MAX_SAFE_INTEGER;
      return leftValue - rightValue || leftKey.localeCompare(rightKey);
    }),
  );
}

function isRecord(value: unknown): value is Record<string, string> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === "string");
}
