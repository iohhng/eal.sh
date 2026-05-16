import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";

interface PositionedPoint {
  line?: number;
  offset?: number;
}

interface MarkdownNode {
  type: string;
  name?: string;
  attributes?: Record<string, string | true>;
  children?: MarkdownNode[];
  ordered?: boolean;
  spread?: boolean;
  start?: number;
  position?: {
    start?: PositionedPoint;
    end?: PositionedPoint;
  };
  data?: {
    hProperties?: Record<string, unknown>;
  };
}

export interface ProofBlock {
  body: string;
  topLevel: boolean;
  startLine: number;
  startOffset: number;
  endOffset: number;
}

type ListStyle = "roman" | "alpha" | "decimal";

export function scanProofBlocks(markdown: string): ProofBlock[] {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(markdown) as MarkdownNode;
  const blocks: ProofBlock[] = [];

  visit(tree as never, "containerDirective", (node: MarkdownNode, _index, parent: MarkdownNode | undefined) => {
    if (node.name !== "proof") return;

    const startLine = node.position?.start?.line;
    const startOffset = node.position?.start?.offset;
    const endOffset = node.position?.end?.offset;
    if (startLine === undefined || startOffset === undefined || endOffset === undefined) return;

    const adjustedEndOffset = directiveEndOffset(markdown, endOffset);
    blocks.push({
      body: directiveBody(markdown, startOffset, adjustedEndOffset),
      topLevel: parent?.type === "root",
      startLine,
      startOffset,
      endOffset: adjustedEndOffset,
    });
  });

  return blocks.sort((left, right) => left.startOffset - right.startOffset);
}

export function remarkSlippyDirectives() {
  return (tree: MarkdownNode) => {
    transformEnumerates(tree);
  };
}

function directiveEndOffset(markdown: string, endOffset: number): number {
  const after = markdown.slice(endOffset);
  const closingFence = after.match(/^(\r?\n[ \t]*:{3,}[ \t]*(?:\r?\n|$))/);
  return closingFence ? endOffset + closingFence[1].length : endOffset;
}

function directiveBody(markdown: string, startOffset: number, endOffset: number): string {
  const openingLineEnd = markdown.indexOf("\n", startOffset);
  if (openingLineEnd < 0 || openingLineEnd >= endOffset) return "";

  const bodyWithClosingFence = markdown.slice(openingLineEnd + 1, endOffset);
  return bodyWithClosingFence.replace(/(?:\r?\n)?[ \t]*:{3,}[ \t]*(?:\r?\n)?$/u, "").trim();
}

interface Replacement {
  node: MarkdownNode;
  children: MarkdownNode[];
  index: number;
}

function transformEnumerates(tree: MarkdownNode): void {
  const replacements: Replacement[] = [];

  visit(tree as never, "containerDirective", (node: MarkdownNode, index, parent: MarkdownNode | undefined) => {
    if (!isEnumerateDirective(node) || !parent?.children || typeof index !== "number") return;
    replacements.push({ node, children: parent.children, index });
  });

  for (const { node, children, index } of replacements.reverse()) {
    children[index] = enumeratedList(node);
  }
}

function isEnumerateDirective(node: MarkdownNode): boolean {
  return node.type === "containerDirective" && node.name === "enumerate";
}

function enumeratedList(node: MarkdownNode): MarkdownNode {
  const list = (node.children ?? []).find(isOrderedList) ?? listFromChildren(node);
  const properties = (list.data ?? {}).hProperties ?? {};
  list.data = {
    ...(list.data ?? {}),
    hProperties: {
      ...properties,
      className: classNames(properties.className, [
        "slippy-enumerate",
        `slippy-enumerate-${listStyle(node)}`,
      ]),
    },
  };

  const start = listStart(node);
  if (start !== undefined) list.start = start;

  return list;
}

function isOrderedList(node: MarkdownNode): boolean {
  return node.type === "list" && node.ordered === true;
}

function listFromChildren(node: MarkdownNode): MarkdownNode {
  return {
    type: "list",
    ordered: true,
    spread: false,
    children: (node.children ?? []).map((child) => ({
      type: "listItem",
      spread: false,
      children: [child],
    })),
  };
}

function listStyle(node: MarkdownNode): ListStyle {
  const value = (attr(node, "style") ?? attr(node, "type") ?? "roman").toLowerCase();
  if (["alpha", "a", "(a)", "lower-alpha", "lower-latin"].includes(value)) return "alpha";
  if (["decimal", "number", "numeric", "1", "(1)"].includes(value)) return "decimal";
  if (["roman", "i", "(i)", "lower-roman"].includes(value)) return "roman";
  return "roman";
}

function listStart(node: MarkdownNode): number | undefined {
  const value = attr(node, "start");
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function attr(node: MarkdownNode, name: string): string | undefined {
  const value = node.attributes?.[name];
  return typeof value === "string" ? value : undefined;
}

function classNames(existing: unknown, added: string[]): string[] {
  const names =
    typeof existing === "string"
      ? existing.split(/\s+/u).filter(Boolean)
      : Array.isArray(existing)
        ? existing.map(String)
        : [];

  for (const name of added) {
    if (!names.includes(name)) names.push(name);
  }

  return names;
}
