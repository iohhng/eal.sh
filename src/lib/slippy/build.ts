import { scanProofBlocks } from "./directives";
import { diagnostic, failOnErrors } from "./diagnostics";
import { loadSlips } from "./load";
import type { Slip, GraphData, GraphEdge, GraphNode, KnowledgeBase, Reference } from "./model";
import { isResultKind } from "./model";
import { slipDisplay, parseReferences, resolveReference } from "./references";

export async function buildKnowledgeBase(): Promise<KnowledgeBase> {
  const slips = await loadSlips();
  const kb: KnowledgeBase = {
    slips,
    references: [],
    graph: { nodes: [], edges: [] },
    diagnostics: [],
    lookup: {},
  };

  extractProofs(kb);
  validateSlips(kb);
  buildLookup(kb);
  collectReferences(kb);
  connectReferences(kb);
  connectSemanticRelations(kb);
  kb.graph = buildGraph(kb);

  failOnErrors(kb.diagnostics);
  return kb;
}

function extractProofs(kb: KnowledgeBase): void {
  for (const slip of kb.slips) {
    const proofs = scanProofBlocks(slip.body);
    const topLevelProofs = proofs.filter((proof) => proof.topLevel);
    const nestedProofs = proofs.filter((proof) => !proof.topLevel);

    for (const proof of nestedProofs) {
      kb.diagnostics.push(diagnostic("error", `proof directive at line ${proof.startLine} must be top-level`, slip.key));
    }

    if (topLevelProofs.length > 1) {
      kb.diagnostics.push(diagnostic("error", "slip has more than one top-level proof", slip.key));
    }

    const proof = topLevelProofs[0];
    if (!proof) continue;

    if (!isResultKind(slip.kind)) {
      kb.diagnostics.push(diagnostic("error", "only theorem, proposition, and lemma slips may have proofs", slip.key));
    }

    const afterProof = slip.body.slice(proof.endOffset).trim();
    if (afterProof) {
      kb.diagnostics.push(diagnostic("error", "proof must be the final content in a slip", slip.key));
    }

    slip.proof = proof.body;
    slip.body = slip.body.slice(0, proof.startOffset).trim();
  }
}

function validateSlips(kb: KnowledgeBase): void {
  for (const slip of kb.slips) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slip.handle)) {
      kb.diagnostics.push(diagnostic("error", `invalid slip handle "${slip.handle}"`, slip.key));
    }

    for (const alias of slip.aliases) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(alias)) {
        kb.diagnostics.push(diagnostic("error", `invalid alias "${alias}"`, slip.key));
      }
    }
  }
}

function buildLookup(kb: KnowledgeBase): void {
  const owners = new Map<string, string>();

  for (const slip of kb.slips) {
    registerLookup(kb, owners, slip.key, slip.key, slip.key);
    for (const alias of slip.aliases) {
      registerLookup(kb, owners, `${slip.namespace}:${alias}`, slip.key, slip.key);
    }
  }
}

function registerLookup(
  kb: KnowledgeBase,
  owners: Map<string, string>,
  key: string,
  canonical: string,
  owner: string,
): void {
  const existing = owners.get(key);
  if (existing && existing !== owner) {
    kb.diagnostics.push(diagnostic("error", `duplicate slip handle or alias "${key}"`, owner));
    return;
  }

  owners.set(key, owner);
  kb.lookup[key] = canonical;
}

function collectReferences(kb: KnowledgeBase): void {
  for (const slip of kb.slips) {
    const refs: Reference[] = [
      ...parseReferences(slip.body).map((parsed) => resolveReference(kb, parsed, slip.key)),
      ...parseReferences(slip.proof ?? "").map((parsed) => resolveReference(kb, parsed, slip.key)),
    ];

    for (const ref of refs) {
      if (!ref.resolved) {
        kb.diagnostics.push(diagnostic("error", `unresolved reference ${ref.raw}`, slip.key));
      }
    }

    slip.outgoingRefs.push(...refs);
    kb.references.push(...refs);
  }
}

function connectReferences(kb: KnowledgeBase): void {
  const slips = new Map(kb.slips.map((slip) => [slip.key, slip]));

  for (const ref of kb.references) {
    if (!ref.resolved || !ref.targetKey || ref.targetKey === ref.sourceKey) continue;

    const source = slips.get(ref.sourceKey);
    const target = slips.get(ref.targetKey);
    if (!source || !target) continue;

    pushUnique(source.dependsOn, target.key);
    pushUnique(target.usedBy, source.key);
    target.incomingRefs.push(ref);
  }
}

function connectSemanticRelations(kb: KnowledgeBase): void {
  const slips = new Map(kb.slips.map((slip) => [slip.key, slip]));

  for (const slip of kb.slips) {
    for (const raw of slip.declaredGeneralizes) {
      const targetKey = resolveRelationTarget(kb, raw, slip.key, "generalizes");
      const target = targetKey ? slips.get(targetKey) : undefined;
      if (!target) continue;
      pushUnique(slip.generalizes, target.key);
      pushUnique(target.generalizedBy, slip.key);
    }

    for (const raw of slip.declaredExampleOf) {
      const targetKey = resolveRelationTarget(kb, raw, slip.key, "example_of");
      const target = targetKey ? slips.get(targetKey) : undefined;
      if (!target) continue;
      pushUnique(slip.exampleOf, target.key);
      pushUnique(target.examples, slip.key);
    }
  }
}

function resolveRelationTarget(kb: KnowledgeBase, raw: string, sourceKey: string, field: string): string | undefined {
  const target = kb.lookup[raw];
  if (!target) {
    kb.diagnostics.push(diagnostic("error", `unresolved ${field} relation "${raw}"`, sourceKey));
  }
  return target;
}

function buildGraph(kb: KnowledgeBase): GraphData {
  const nodes: GraphNode[] = kb.slips.map((slip) => ({
    id: slip.key,
    label: graphLabel(slip),
    url: slip.url,
    kind: slip.kind,
    nodeType: "slip",
  }));

  const edges: GraphEdge[] = [];
  for (const slip of kb.slips) {
    for (const dependency of slip.dependsOn) {
      edges.push({ source: dependency, target: slip.key, kind: "dependency" });
    }

    for (const lessGeneral of slip.generalizes) {
      edges.push({ source: lessGeneral, target: slip.key, kind: "generalizes" });
    }

    for (const exemplified of slip.exampleOf) {
      edges.push({ source: slip.key, target: exemplified, kind: "example-of" });
    }
  }

  return { nodes, edges: uniqueEdges(edges) };
}

function graphLabel(slip: Slip): string {
  return slipDisplay(slip);
}

function uniqueEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source}|${edge.target}|${edge.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}
