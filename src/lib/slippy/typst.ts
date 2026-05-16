import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { escapeHtml } from "./util";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const publicDir = path.join(root, "public", "slippy-typst");
const distDir = path.join(root, "dist", "slippy-typst");
const publicUrl = "/slippy-typst";
let compiler: { svg(input: { mainFileContent: string }): string } | undefined;

interface MarkdownNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MarkdownNode[];
}

export function remarkTypstBlocks() {
  return async (tree: MarkdownNode) => {
    const codeNodes: MarkdownNode[] = [];
    visit(tree as never, "code", (node: MarkdownNode) => {
      if (node.lang === "typst" && typeof node.value === "string") codeNodes.push(node);
    });

    await Promise.all(codeNodes.map(transformTypstNode));
  };
}

async function transformTypstNode(node: MarkdownNode): Promise<void> {
  node.type = "html";
  node.value = await renderTypstBlock(node.value ?? "");
  delete node.lang;
  delete node.children;
}

async function renderTypstBlock(source: string): Promise<string> {
  const fullSource = wrapTypst(source);
  const hash = createHash("sha256").update(fullSource).digest("hex").slice(0, 16);
  const filename = `${hash}.svg`;
  const outPath = path.join(publicDir, filename);
  const distPath = path.join(distDir, filename);

  try {
    await Promise.all([mkdir(publicDir, { recursive: true }), mkdir(distDir, { recursive: true })]);
    if (await exists(outPath)) {
      if (!(await exists(distPath))) {
        await writeFile(distPath, await readFile(outPath, "utf8"), "utf8");
      }
      return typstFigure(filename);
    }

    const svg = (await getCompiler()).svg({ mainFileContent: fullSource });
    await Promise.all([writeFile(outPath, svg, "utf8"), writeFile(distPath, svg, "utf8")]);
    return typstFigure(filename);
  } catch (error) {
    return `<pre class="typst-error"><code>${escapeHtml(String(error))}\n\n${escapeHtml(source)}</code></pre>`;
  }
}

async function getCompiler(): Promise<{ svg(input: { mainFileContent: string }): string }> {
  if (!compiler) {
    const { NodeCompiler } = await import("@myriaddreamin/typst-ts-node-compiler");
    compiler = NodeCompiler.create({ workspace: root });
  }
  return compiler;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function typstFigure(filename: string): string {
  return `<figure class="typst-figure"><img src="${publicUrl}/${filename}" alt="Typst diagram" loading="lazy"></figure>`;
}

function wrapTypst(source: string): string {
  return `
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#set page(width: auto, height: auto, margin: (top: 11pt, right: 11pt, bottom: 11pt, left: 11pt))
#let diagram = diagram.with(label-size: 0.80em)
#scale(x: 134.25%, y: 134.25%, reflow: true)[
${source}
]
`;
}
