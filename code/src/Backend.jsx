import React, { useRef } from "react";
import {
  Globe,
  ShieldCheck,
  Database,
  Braces,
  ArrowUpRight,
  GripHorizontal,
  Check,
  X,
} from "lucide-react";
export const stepIcons = {
  request: Globe,
  validate: ShieldCheck,
  database: Database,
  transform: Braces,
  response: ArrowUpRight,
};
export function BackendGraph({
  backend,
  selected,
  onSelect,
  onEdit,
  onMove,
  zoom,
  trace = [],
}) {
  const drag = useRef(null);
  const height = Math.max(780, ...backend.nodes.map((n) => n.y + 160));
  const width = Math.max(850, ...backend.nodes.map((n) => n.x + 300));
  return (
    <div
      className="graph-stage"
      style={{ width: width * zoom, height: height * zoom }}
    >
      <div
        className="graph-space"
        style={{ width, height, transform: `scale(${zoom})` }}
      >
        <svg className="graph-edges" width={width} height={height}>
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path
                d="M0 0L6 3L0 6"
                fill="none"
                stroke="var(--selection-border)"
              />
            </marker>
          </defs>
          {backend.edges.map((edge, i) => {
            const a = backend.nodes.find((n) => n.id === edge.source),
              b = backend.nodes.find((n) => n.id === edge.target);
            if (!a || !b) return null;
            const x1 = a.x + 130,
              y1 = a.y + 116,
              x2 = b.x + 130,
              y2 = b.y;
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2 - 7}`}
                  fill="none"
                  stroke="var(--selection-border)"
                  strokeWidth="1.6"
                  markerEnd="url(#arrow)"
                />
                <rect
                  x={(x1 + x2) / 2 - 27}
                  y={(y1 + y2) / 2 - 9}
                  width="54"
                  height="18"
                  rx="9"
                  fill="var(--selection-soft)"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--selection)"
                >
                  {i === 0 ? "request" : "success"}
                </text>
              </g>
            );
          })}
        </svg>
        {backend.nodes.map((n) => {
          const Icon = stepIcons[n.type];
          const state = trace.find((t) => t.id === n.id)?.state;
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={`Backend step ${n.title}`}
              className={`flow-node flow-${n.type} ${selected === n.id ? "selected" : ""} ${state || ""}`}
              style={{ left: n.x, top: n.y }}
              onClick={() => onSelect(n.id)}
              onDoubleClick={() => onEdit(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEdit(n.id);
              }}
            >
              <div className="flow-port top" />
              <div className="flow-node-header">
                <span className="flow-icon">
                  <Icon size={16} />
                </span>
                <span>{n.type.toUpperCase()}</span>
                <button
                  aria-label={`Move ${n.title}`}
                  className="drag-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = {
                      clientX: e.clientX,
                      clientY: e.clientY,
                      x: n.x,
                      y: n.y,
                      node: n,
                      element: e.currentTarget.closest(".flow-node"),
                    };
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current;
                    if (d && d.node.id === n.id) {
                      const x = Math.max(
                          10,
                          d.x + (e.clientX - d.clientX) / zoom,
                        ),
                        y = Math.max(10, d.y + (e.clientY - d.clientY) / zoom);
                      d.element.style.left = x + "px";
                      d.element.style.top = y + "px";
                    }
                  }}
                  onPointerUp={(e) => {
                    const d = drag.current;
                    if (!d) return;
                    drag.current = null;
                    onMove({
                      ...n,
                      x: Math.max(
                        10,
                        Math.round(d.x + (e.clientX - d.clientX) / zoom),
                      ),
                      y: Math.max(
                        10,
                        Math.round(d.y + (e.clientY - d.clientY) / zoom),
                      ),
                    });
                  }}
                >
                  <GripHorizontal size={15} />
                </button>
              </div>
              <strong>{n.title}</strong>
              <p>{n.description}</p>
              <div className="flow-meta">
                <code>
                  {n.type === "request"
                    ? `${n.config.method} ${n.config.path}`
                    : n.type === "database"
                      ? `${n.config.operation} · ${n.config.collection}`
                      : n.type === "validate"
                        ? n.config.required || "No required fields"
                        : n.type === "response"
                          ? `${n.config.status} OK`
                          : `wrap as ${n.config.key || "results"}`}
                </code>
                {state === "success" ? (
                  <Check size={12} />
                ) : state === "error" ? (
                  <X size={12} />
                ) : (
                  <span className="status-dot" />
                )}
              </div>
              <div className="flow-port bottom" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
