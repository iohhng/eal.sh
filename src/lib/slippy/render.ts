import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeMathjaxChtml from "rehype-mathjax/chtml";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { remarkSlippyDirectives } from "./directives";
import type { Slip, KnowledgeBase } from "./model";
import { isResultKind } from "./model";
import { remarkSlippyReferences, slipReferenceDisplay } from "./references";
import { remarkTypstBlocks } from "./typst";
import { escapeHtml } from "./util";

const mathjaxOptions = {
  tex: {
    macros: {
      Hom: "\\operatorname{Hom}",
      Spec: "\\operatorname{Spec}",
      End: "\\operatorname{End}",
      id: "\\operatorname{id}",
      im: "\\operatorname{im}",
      Mod: "\\operatorname{Mod}",
    },
  },
  chtml: {
    fontURL: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2",
  },
};

const BLOCK_CONTAINERS = new Set(["blockquote", "dd", "div", "p", "section"]);
const NON_CONTENT_ELEMENTS = new Set(["script", "style", "template"]);

interface HtmlNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
}

export async function renderSlip(slip: Slip, kb: KnowledgeBase): Promise<string> {
  const body = await markdownToHtml(slip.body, kb);
  const proof = slip.proof
    ? await markdownToHtml(slip.proof, kb)
    : "";
  const header = slipHeaderNodes(slip);
  const italic = isResultKind(slip.kind);
  const bodyHtml = mergeHeaderIntoBody(body, header, italic);
  const proofHtml = proof ? addProofHeadingAndQed(proof) : "";
  const bodyClass = italic ? "slip-body slip-body-is-italic" : "slip-body";

  return `
<article class="slip slip-${slip.kind}" data-slip-key="${escapeHtml(slip.key)}">
  <div class="${bodyClass}">${bodyHtml}</div>
  ${proofHtml ? `<div class="proof-block">${proofHtml}</div>` : ""}
</article>
`;
}

function slipHeaderNodes(slip: Slip): HtmlNode[] {
  const reference = slipReferenceDisplay(slip);
  if (!slip.title) {
    return [spanNode(["env-heading", "slip-heading"], `${reference}.`)];
  }

  return [
    spanNode(["env-heading", "slip-heading"], reference),
    textNode(" "),
    spanNode(["env-title"], `(${slip.title}).`),
  ];
}

function mergeHeaderIntoBody(body: string, header: HtmlNode[], italic: boolean): string {
  const trimmed = body.trim();
  return transformHtmlFragment(trimmed, (tree) => {
    const first = firstContentChild(tree);
    if (first?.type === "element" && first.tagName === "p") {
      addClass(first, "env-line");
      first.children = [...header, textNode(" "), ...bodyChildren(first, italic)];
      return;
    }

    tree.children = [paragraphNode("env-line", header), ...(tree.children ?? [])];
  });
}

function addProofHeadingAndQed(proof: string): string {
  return appendQedToTerminalContent(prependProofHeading(proof.trim()));
}

function prependProofHeading(html: string): string {
  return transformHtmlFragment(html, (tree) => {
    const heading = proofHeadingNode();
    const first = firstContentChild(tree);
    if (first?.type === "element" && first.tagName === "p") {
      first.children = [heading, textNode(" "), ...(first.children ?? [])];
      return;
    }

    tree.children = [paragraphNode(undefined, [heading]), ...(tree.children ?? [])];
  });
}

function appendQedToTerminalContent(html: string): string {
  const file = unified()
    .use(rehypeParse, { fragment: true })
    .use(() => (tree: HtmlNode) => {
      const target = terminalContentContainer(tree);
      if (!target?.children) return;

      if (target.type === "element") addClass(target, "slippy-qed-target");
      target.children.push(qedNode());
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(html);

  return String(file);
}

function terminalContentContainer(parent: HtmlNode): HtmlNode | undefined {
  if (!parent.children) return undefined;

  for (let index = parent.children.length - 1; index >= 0; index -= 1) {
    const child = parent.children[index];
    if (isBlankText(child)) continue;
    if (child.type === "text") return parent;
    if (child.type !== "element") continue;
    if (isNonContentElement(child)) continue;
    if (isDisplayMathContainer(child)) return child;
    if (isList(child)) return terminalListItem(child);
    if (child.tagName === "li") return terminalContentContainer(child) ?? child;
    if (isBlockContainer(child)) return terminalContentContainer(child) ?? child;
    return parent;
  }

  return undefined;
}

function terminalListItem(list: HtmlNode): HtmlNode | undefined {
  if (!list.children) return undefined;

  for (let index = list.children.length - 1; index >= 0; index -= 1) {
    const child = list.children[index];
    if (isBlankText(child)) continue;
    if (child.type === "element" && isNonContentElement(child)) continue;
    if (child.type === "element" && child.tagName === "li") return terminalContentContainer(child) ?? child;
  }

  return undefined;
}

function isList(node: HtmlNode): boolean {
  return node.tagName === "ol" || node.tagName === "ul";
}

function isBlockContainer(node: HtmlNode): boolean {
  return BLOCK_CONTAINERS.has(node.tagName ?? "");
}

function isNonContentElement(node: HtmlNode): boolean {
  return NON_CONTENT_ELEMENTS.has(node.tagName ?? "");
}

function isDisplayMathContainer(node: HtmlNode): boolean {
  return node.tagName === "mjx-container" && String(node.properties?.display) === "true";
}

function transformHtmlFragment(html: string, transform: (tree: HtmlNode) => void): string {
  const file = unified()
    .use(rehypeParse, { fragment: true })
    .use(() => (tree: HtmlNode) => transform(tree))
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(html);

  return String(file);
}

function firstContentChild(parent: HtmlNode): HtmlNode | undefined {
  return parent.children?.find((child) => !isBlankText(child));
}

function bodyChildren(paragraph: HtmlNode, italic: boolean): HtmlNode[] {
  const children = paragraph.children ?? [];
  if (!italic) return children;

  return [{
    type: "element",
    tagName: "span",
    properties: { className: ["slip-body-italic"] },
    children,
  }];
}

function paragraphNode(className: string | undefined, children: HtmlNode[]): HtmlNode {
  return {
    type: "element",
    tagName: "p",
    properties: className ? { className: [className] } : {},
    children,
  };
}

function addClass(node: HtmlNode, className: string): void {
  const properties = { ...(node.properties ?? {}) };
  const current = properties.className;
  const classes =
    typeof current === "string"
      ? current.split(/\s+/u).filter(Boolean)
      : Array.isArray(current)
        ? current.map(String)
        : [];

  if (!classes.includes(className)) classes.push(className);
  properties.className = classes;
  node.properties = properties;
}

function isBlankText(node: HtmlNode): boolean {
  return node.type === "text" && (node.value ?? "").trim() === "";
}

function qedNode(): HtmlNode {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["qed"] },
    children: [],
  };
}

function proofHeadingNode(): HtmlNode {
  return spanNode(["proof-heading"], "Proof.");
}

function spanNode(className: string[], value: string): HtmlNode {
  return {
    type: "element",
    tagName: "span",
    properties: { className },
    children: [textNode(value)],
  };
}

function textNode(value: string): HtmlNode {
  return { type: "text", value };
}

export async function markdownToHtml(markdown: string, kb: KnowledgeBase): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkSlippyDirectives)
    .use(remarkMath)
    .use(remarkSlippyReferences, kb)
    .use(remarkTypstBlocks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeMathjaxChtml, mathjaxOptions as never)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaHidden: "true", tabIndex: -1 },
      content: { type: "text", value: "" },
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
}
