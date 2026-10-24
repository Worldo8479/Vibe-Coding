import React from "react";
import { Check, ArrowUpRight, MoreHorizontal } from "lucide-react";
export function findNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
}
export function NodeView({
  node,
  selected,
  onSelect,
  onEdit,
  preview = false,
}) {
  const parts = node.text.split("|");
  let content;
  if (node.type === "stat")
    content = (
      <>
        <div className="sample-stat-label">
          {parts[0]}
          <ArrowUpRight size={12} />
        </div>
        <div className="sample-stat-value">{parts[1]}</div>
        <div className="sample-stat-change">{parts[2]}</div>
      </>
    );
  else if (node.type === "chart")
    content = (
      <>
        <div className="sample-chart-title">
          {node.text}
          <span>This month⌄</span>
        </div>
        <div className="chart-body">
          <div className="chart-labels">
            <span>30k</span>
            <span>20k</span>
            <span>10k</span>
            <span>0</span>
          </div>
          <svg
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
            aria-label="Sample revenue chart"
          >
            <defs>
              <linearGradient
                id={`fill-${node.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 60, 100, 140].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="400"
                y2={y}
                stroke="#eef0f5"
                strokeDasharray="3 4"
              />
            ))}
            <path
              d="M0 138 C20 135 28 115 48 120 S76 145 100 112 S130 128 152 96 S180 110 202 72 S232 94 254 64 S280 82 302 42 S336 61 354 34 S382 40 400 12 L400 160 L0 160Z"
              fill={`url(#fill-${node.id})`}
            />
            <path
              d="M0 138 C20 135 28 115 48 120 S76 145 100 112 S130 128 152 96 S180 110 202 72 S232 94 254 64 S280 82 302 42 S336 61 354 34 S382 40 400 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
          </svg>
        </div>
        <div className="chart-days">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </>
    );
  else if (node.type === "tasklist")
    content = (
      <>
        <div className="sample-chart-title">
          {parts[0]}
          <MoreHorizontal size={14} />
        </div>
        {parts.slice(1).map((task, i) => (
          <div className="sample-task" key={i}>
            <span className={`task-check check-${i}`}>
              {i === 0 ? <Check size={10} /> : null}
            </span>
            <div>
              {task}
              <small>
                {
                  [
                    "Just completed",
                    "In progress",
                    "Ready to review",
                    "In progress",
                  ][i % 4]
                }
              </small>
            </div>
            <span className="tiny-avatar">
              {["AK", "JD", "SM", "JD"][i % 4]}
            </span>
          </div>
        ))}
      </>
    );
  else if (node.type === "art")
    content = (
      <div className="sample-art">
        <div className="art-orb" />
        <span>{node.text}</span>
        <ArrowUpRight size={18} />
      </div>
    );
  else content = node.text;
  const Tag = node.type === "button" && !preview ? "button" : "div";
  return (
    <Tag
      type={node.type === "button" ? "button" : undefined}
      data-node-id={node.id}
      className={`canvas-node node-${node.type} ${!preview ? "editable-node" : ""} ${!preview && selected === node.id ? "selected-node" : ""}`}
      style={node.style}
      tabIndex={!preview ? 0 : undefined}
      aria-label={!preview ? `Select ${node.name}` : undefined}
      onClick={
        preview
          ? undefined
          : (e) => {
              e.stopPropagation();
              onSelect?.(node.id);
            }
      }
      onDoubleClick={
        preview
          ? undefined
          : (e) => {
              e.stopPropagation();
              onEdit?.(node.id);
            }
      }
      onKeyDown={
        preview
          ? undefined
          : (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(node.id);
              }
            }
      }
    >
      {!preview && selected === node.id && (
        <span className="node-selection-label">{node.name}</span>
      )}
      {content}
      {node.children.map((child) => (
        <NodeView
          key={child.id}
          node={child}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
          preview={preview}
        />
      ))}
    </Tag>
  );
}
export function MiniPreview({ project }) {
  const ref = React.useRef();
  const [scale, setScale] = React.useState(0.33);
  React.useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setScale(entries[0].contentRect.width / 800),
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`mini-preview mini-${project.template}`}>
      <div className="mini-browser">
        <i />
        <i />
        <i />
        <span>{project.name.toLowerCase().replaceAll(" ", "-")}.app</span>
      </div>
      <div className="mini-document" style={{ transform: `scale(${scale})` }}>
        <NodeView node={project.document} preview />
      </div>
    </div>
  );
}
export function LayerTree({ node, selected, onSelect, onEdit, depth = 0 }) {
  const [closed, setClosed] = React.useState(false);
  return (
    <>
      <div
        className={`layer-item ${selected === node.id ? "active" : ""}`}
        style={{ paddingLeft: 14 + depth * 13 }}
      >
        <button
          className="layer-toggle"
          aria-label={`${closed ? "Expand" : "Collapse"} ${node.name}`}
          onClick={() => setClosed(!closed)}
        >
          {node.children.length ? (
            closed ? (
              "›"
            ) : (
              "⌄"
            )
          ) : (
            <span className={node.type === "text" ? "text-symbol" : ""}>
              {node.type === "text" ? "T" : node.type === "button" ? "▭" : "◇"}
            </span>
          )}
        </button>
        <button
          onClick={() => onSelect(node.id)}
          onDoubleClick={() => onEdit(node.id)}
        >
          {node.name}
        </button>
      </div>
      {!closed &&
        node.children.map((child) => (
          <LayerTree
            key={child.id}
            node={child}
            selected={selected}
            onSelect={onSelect}
            onEdit={onEdit}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
export function exportHTML(project) {
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function render(n) {
    const tag = n.type === "button" ? "button" : "div";
    const css = Object.entries(n.style)
      .map(
        ([k, v]) =>
          `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${typeof v === "number" && !["fontWeight", "opacity", "lineHeight", "flex", "order", "flexGrow", "flexShrink"].includes(k) ? v + "px" : v}`,
      )
      .join(";");
    const text = n.text
      .split("|")
      .map((t) => escape(t))
      .join("<br>");
    return `<${tag} style="${escape(css)}" data-element="${escape(n.id)}">${text}${n.children.map(render).join("")}</${tag}>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(project.name)}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif}button{border:0;font:inherit;cursor:pointer}@media(max-width:600px){[data-element]{max-width:100%;word-break:break-word}}</style></head><body>${render(project.document)}</body></html>`;
}
