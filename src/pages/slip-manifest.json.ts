import { getKnowledgeBase } from "../lib/slippy/kb";
import { slipDisplay, slipReferenceDisplay } from "../lib/slippy/references";

export async function GET() {
  const kb = await getKnowledgeBase();
  const slips = kb.slips.map((slip) => ({
    key: slip.key,
    label: slip.label,
    kind: slip.kind,
    title: slip.title,
    display: slipDisplay(slip),
    reference: slipReferenceDisplay(slip),
    namespace: slip.namespace,
    handle: slip.handle,
    aliases: slip.aliases,
    url: slip.url,
  }));

  return new Response(JSON.stringify({ slips }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
