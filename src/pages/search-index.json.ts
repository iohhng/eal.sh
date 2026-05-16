import { getKnowledgeBase } from "../lib/slippy/kb";
import { slipDisplay } from "../lib/slippy/references";

interface SearchEntry {
  key: string;
  kind: string;
  title?: string;
  display: string;
  handle: string;
  aliases: string[];
  url: string;
  search_text: string;
}

export async function GET() {
  const kb = await getKnowledgeBase();
  const entries: SearchEntry[] = kb.slips.map((slip) => ({
    key: slip.key,
    kind: slip.kind,
    title: slip.title,
    display: slipDisplay(slip),
    handle: slip.handle,
    aliases: slip.aliases,
    url: slip.url,
    search_text: searchText([
      slip.key,
      slip.handle,
      ...slip.aliases,
      slip.title,
      slip.kind,
    ]),
  }));

  return new Response(JSON.stringify({ entries }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function searchText(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}
