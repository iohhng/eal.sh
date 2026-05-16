import type { KnowledgeBase } from "./model";
import { buildKnowledgeBase } from "./build";

let cached: Promise<KnowledgeBase> | undefined;

export function getKnowledgeBase(): Promise<KnowledgeBase> {
  cached ??= buildKnowledgeBase();
  return cached;
}

export function clearKnowledgeBaseCache(): void {
  cached = undefined;
}
