import type { EdgeKind, GraphData } from "./model";

export interface GraphOptions {
  root?: string;
  mode?: "global" | "local";
  traverse?: EdgeKind[];
  renderEdges?: EdgeKind[];
  depth?: number;
}

export function projectGraph(graph: GraphData, options: GraphOptions = {}): GraphData {
  const mode = options.mode ?? "global";
  const renderKinds = new Set(options.renderEdges ?? ["dependency"]);

  let nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (mode === "local" && options.root) {
    nodeIds = localNodeIds(
      graph,
      options.root,
      new Set(options.traverse ?? ["dependency"]),
      options.depth ?? 2,
    );
  }

  const nodes = graph.nodes
    .filter((node) => nodeIds.has(node.id))
    .map((node) => ({ ...node, current: node.id === options.root }));
  const visible = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => renderKinds.has(edge.kind) && visible.has(edge.source) && visible.has(edge.target),
  );

  return { nodes, edges };
}

function localNodeIds(graph: GraphData, root: string, traversable: Set<EdgeKind>, depth: number): Set<string> {
  const seen = new Set<string>([root]);
  let frontier = new Set<string>([root]);

  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (!traversable.has(edge.kind)) continue;
      if (frontier.has(edge.source) && !seen.has(edge.target)) next.add(edge.target);
      if (frontier.has(edge.target) && !seen.has(edge.source)) next.add(edge.source);
    }
    for (const id of next) seen.add(id);
    frontier = next;
  }

  return seen;
}
