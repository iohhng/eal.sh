import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import type { Slip, SlipNamespace, KnowledgeBase, ParsedReference, Reference } from "./model";

const SLIP_NAMESPACES: SlipNamespace[] = ["def", "ex", "thm", "prop", "lem"];

interface MarkdownNode {
  type: string;
  url?: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hProperties?: Record<string, unknown>;
  };
}

export function parseReferences(markdown: string): ParsedReference[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkMath)
    .parse(markdown) as MarkdownNode;
  const refs: ParsedReference[] = [];

  visit(tree as never, "link", (node: MarkdownNode) => {
    if (!node.url || !isSlipTarget(node.url)) return;
    const text = plainText(node);

    refs.push({
      raw: `[${text}](${node.url})`,
      target: node.url,
      customText: text || undefined,
    });
  });

  return refs;
}

export function remarkSlippyReferences(kb: KnowledgeBase) {
  const slips = new Map(kb.slips.map((slip) => [slip.key, slip]));

  return (tree: MarkdownNode) => {
    visit(tree as never, "link", (node: MarkdownNode) => {
      if (!node.url || !isSlipTarget(node.url)) return;

      const target = slips.get(kb.lookup[node.url] ?? "");
      if (!target) return;

      node.url = target.url;
      node.data = {
        ...(node.data ?? {}),
        hProperties: {
          ...((node.data ?? {}).hProperties ?? {}),
          className: classNames((node.data ?? {}).hProperties?.className, "slip-ref"),
        },
      };
    });
  };
}

export function resolveReference(kb: KnowledgeBase, parsed: ParsedReference, sourceKey: string): Reference {
  const canonical = kb.lookup[parsed.target];
  return {
    sourceKey,
    raw: parsed.raw,
    target: parsed.target,
    customText: parsed.customText,
    targetKey: canonical,
    resolved: Boolean(canonical),
  };
}

export function slipByKey(kb: KnowledgeBase, key: string): Slip | undefined {
  return kb.slips.find((slip) => slip.key === key);
}

export function slipDisplay(slip: Slip): string {
  return slip.title;
}

export function kindLabel(kind: string): string {
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

function isSlipTarget(url: string): boolean {
  const [namespace] = url.split(":", 1);
  return SLIP_NAMESPACES.includes(namespace as SlipNamespace);
}

function plainText(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(plainText).join("");
}

function classNames(existing: unknown, added: string): string[] {
  const names =
    typeof existing === "string"
      ? existing.split(/\s+/u).filter(Boolean)
      : Array.isArray(existing)
        ? existing.map(String)
        : [];

  if (!names.includes(added)) names.push(added);
  return names;
}
