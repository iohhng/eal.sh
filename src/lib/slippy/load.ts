import { getCollection } from "astro:content";
import type { Slip } from "./model";
import { kindForFolder, namespaceForKind, urlSegmentForNamespace } from "./model";

export async function loadSlips(): Promise<Slip[]> {
  const entries = await getCollection("slips");

  return entries.map((entry): Slip => {
    const sourceId = entry.id.replace(/\\/g, "/").replace(/\.md$/u, "");
    const folder = sourceId.split("/")[0] ?? "";
    const kind = kindForFolder(folder);
    if (!kind) {
      throw new Error(`slip "${sourceId}" must live in definitions, examples, theorems, propositions, or lemmas`);
    }

    const handle = leafName(sourceId);
    const namespace = namespaceForKind(kind);

    return {
      key: `${namespace}:${handle}`,
      namespace,
      handle,
      kind,
      label: "",
      title: entry.data.title,
      aliases: entry.data.aliases,
      declaredDependsOn: entry.data.depends_on,
      declaredGeneralizes: entry.data.generalizes,
      declaredExampleOf: entry.data.example_of,
      url: `/${urlSegmentForNamespace(namespace)}/${handle}`,
      sourceId,
      body: entry.body ?? "",
      outgoingRefs: [],
      incomingRefs: [],
      dependsOn: [],
      usedBy: [],
      generalizes: [],
      generalizedBy: [],
      exampleOf: [],
      examples: [],
    };
  });
}

function leafName(value: string): string {
  const parts = value.split("/");
  return parts[parts.length - 1] ?? value;
}
