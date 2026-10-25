import { findNode } from "./model.js";

// Selected-element requests only send and generate that element. This keeps
// local-model work small and avoids regenerating the entire page for a tiny edit.
export function generationInstructions(
  project,
  { targetId, area = "frontend", initial = false },
) {
  if (targetId && !initial) {
    const node =
      area === "backend"
        ? project.backend.nodes.find((n) => n.id === targetId)
        : findNode(project.document, targetId);
    if (!node)
      throw new Error(
        "The selected element no longer exists. Select it again.",
      );
    const schema =
      area === "backend"
        ? "The node is a backend step with exactly these fields: id,type,title,description,x,y,config. Keep x and y as numbers. Preserve the existing config keys and their value types; config.required is a comma-separated string."
        : "Every canvas node must contain id,type,name,text,style,children. Never omit an empty style object or children array. Preserve children unless the user requests changing them. Styles are React CSS values (strings or numbers); no url(), position, zIndex, or pointerEvents.";
    return `You are a collaborative visual app builder. For new or recolored UI, use red, blue, and neutral tones; avoid purple. Return only JSON with exactly two fields: node and summary. Update the supplied ${area === "backend" ? "backend step" : "canvas element"} according to the user request. Preserve its id and type. Change only the requested properties and preserve all other properties. ${schema} Summary is a short string describing the applied change. Current node JSON: ${JSON.stringify(node)}`;
  }
  return `You are a collaborative visual app builder. For new or recolored UI, use red, blue, and neutral tones; avoid purple. Output JSON with document, backend, summary. Preserve every existing node ID unless removing it. document is a recursive tree {id,type,name,text,style,children}; type must be container,text,button,badge,stat,chart,tasklist,art. style is a React CSS object with string or numeric values; no url(), position, zIndex or pointerEvents. Each node must have children array and style object. stat text is label|value|change. tasklist text is title|task1|task2. Create an attractive, polished interface specific to the prompt, using nested containers and CSS grid/flex. No scripts or external assets. Backend is {nodes,edges}; nodes are {id,type,title,description,x,y,config}, types request/validate/database/transform/response. Single linear path connecting all nodes from exactly one request to exactly one response. Config: request {method,path}; validate {required: comma-separated fields}; database {collection,operation:read or write}; transform {key}; response {status}. Maximum 100 canvas nodes, 20 backend nodes. ${initial ? "Generate both a full frontend and suitable backend from the prompt." : `Edit only the ${area}. ${targetId ? `Only modify node ${targetId} and its descendants; preserve the rest.` : "Apply the requested change."}`} The summary must be concise and honest. Current project JSON: ${JSON.stringify({ document: project.document, backend: project.backend })}`;
}

export function expandGeneratedResult(
  result,
  project,
  { targetId, area = "frontend", initial = false },
) {
  if (!targetId || initial) return result;
  if (!result?.node || result.node.id !== targetId)
    throw new Error(
      "The model did not preserve the selected element. Please try again.",
    );
  const next = {
    document: structuredClone(project.document),
    backend: structuredClone(project.backend),
    summary: result.summary,
  };
  const selected =
    area === "backend"
      ? next.backend.nodes.find((n) => n.id === targetId)
      : findNode(next.document, targetId);
  if (!selected || selected.type !== result.node.type)
    throw new Error(
      "The model changed the selected element type. Try a general prompt instead.",
    );
  for (const key of Object.keys(selected)) delete selected[key];
  Object.assign(selected, result.node);
  return next;
}
