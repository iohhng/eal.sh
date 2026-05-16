export type SlipKind =
  | "definition"
  | "example"
  | "theorem"
  | "proposition"
  | "lemma";

export type ResultKind = "theorem" | "proposition" | "lemma";
export type SlipNamespace = "def" | "ex" | "thm" | "prop" | "lem";
export type EdgeKind = "dependency" | "generalizes" | "example-of";
export type Severity = "warning" | "error";

export interface Diagnostic {
  severity: Severity;
  message: string;
  slipKey?: string;
}

export interface ParsedReference {
  raw: string;
  target: string;
  customText?: string;
}

export interface Reference {
  sourceKey: string;
  raw: string;
  target: string;
  customText?: string;
  targetKey?: string;
  resolved: boolean;
}

export interface Slip {
  key: string;
  namespace: SlipNamespace;
  handle: string;
  kind: SlipKind;
  title: string;
  aliases: string[];
  declaredGeneralizes: string[];
  declaredExampleOf: string[];
  url: string;
  sourceId: string;
  body: string;
  proof?: string;
  outgoingRefs: Reference[];
  incomingRefs: Reference[];
  dependsOn: string[];
  usedBy: string[];
  generalizes: string[];
  generalizedBy: string[];
  exampleOf: string[];
  examples: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  url: string;
  kind: SlipKind;
  nodeType: "slip";
  current?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeBase {
  slips: Slip[];
  references: Reference[];
  graph: GraphData;
  diagnostics: Diagnostic[];
  lookup: Record<string, string>;
}

export const RESULT_KINDS: ResultKind[] = ["theorem", "proposition", "lemma"];

export function isResultKind(kind: SlipKind): kind is ResultKind {
  return RESULT_KINDS.includes(kind as ResultKind);
}

export function namespaceForKind(kind: SlipKind): SlipNamespace {
  if (kind === "definition") return "def";
  if (kind === "example") return "ex";
  if (kind === "theorem") return "thm";
  if (kind === "proposition") return "prop";
  return "lem";
}

export function urlSegmentForNamespace(namespace: SlipNamespace): string {
  if (namespace === "def") return "definitions";
  if (namespace === "ex") return "examples";
  if (namespace === "thm") return "theorems";
  if (namespace === "prop") return "propositions";
  return "lemmas";
}

export function kindForFolder(folder: string): SlipKind | undefined {
  if (folder === "definitions") return "definition";
  if (folder === "examples") return "example";
  if (folder === "theorems") return "theorem";
  if (folder === "propositions") return "proposition";
  if (folder === "lemmas") return "lemma";
  return undefined;
}
