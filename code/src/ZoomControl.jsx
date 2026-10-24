import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Maximize2 } from "lucide-react";

const presets = [25, 50, 75, 100, 125, 150, 200, 400];

export function ZoomControl({ zoom, onChange, onFit }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(`${Math.round(zoom * 100)}%`);
  const root = useRef(null);
  const input = useRef(null);
  const optionsId = useId();
  const display = `${Math.round(zoom * 100)}%`;

  useEffect(() => setValue(`${Math.round(zoom * 100)}%`), [zoom]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function apply() {
    const text = value.trim().replace(/%$/, "").trim();
    if (!/^\d+(?:\.\d+)?$/.test(text)) {
      setValue(display);
      return;
    }
    const percent = Math.min(400, Math.max(10, Number(text)));
    onChange(percent / 100);
    setValue(`${Math.round(percent * 100) / 100}%`);
  }
  function focusOptions() {
    setOpen(true);
    requestAnimationFrame(() =>
      root.current?.querySelector(".zoom-options button")?.focus(),
    );
  }
  function choose(action) {
    action();
    setOpen(false);
    input.current?.focus();
  }

  return (
    <div
      className={`zoom-control ${open ? "is-open" : ""}`}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setValue(display);
          setOpen(false);
          input.current?.focus();
        }
      }}
    >
      <input
        ref={input}
        aria-label="Zoom percentage"
        title="Zoom percentage (10–400%)"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={apply}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
            setOpen(false);
            event.currentTarget.select();
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusOptions();
          }
        }}
      />
      <button
        className="zoom-toggle"
        aria-label="Zoom options"
        aria-expanded={open}
        aria-controls={optionsId}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusOptions();
          }
        }}
      >
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          className="zoom-options"
          id={optionsId}
          role="group"
          aria-label="Canvas zoom"
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const items = [...event.currentTarget.querySelectorAll("button")];
            const index = items.indexOf(document.activeElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          <button className="zoom-fit" onClick={() => choose(onFit)}>
            <Maximize2 size={14} /> Fit to canvas
          </button>
          <div className="zoom-options-divider" />
          {presets.map((percent) => (
            <button
              key={percent}
              aria-pressed={Math.abs(zoom * 100 - percent) < 0.01}
              onClick={() => choose(() => onChange(percent / 100))}
            >
              <span>{percent}%</span>
              {Math.abs(zoom * 100 - percent) < 0.01 && <Check size={14} />}
            </button>
          ))}
          <span className="zoom-hint">Type any value from 10–400%</span>
        </div>
      )}
    </div>
  );
}
