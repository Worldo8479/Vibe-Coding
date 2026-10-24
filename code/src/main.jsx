import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Bell,
  Boxes,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  Folder,
  Globe,
  Grid2X2,
  Home,
  Layers,
  LayoutDashboard,
  Link,
  List,
  LoaderCircle,
  Maximize2,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  PanelLeftClose,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Users,
  WandSparkles,
  Workflow,
  X,
  Undo2,
  CheckCheck,
  Command,
  LogOut,
} from "lucide-react";
import {
  NodeView,
  MiniPreview,
  LayerTree,
  findNode,
  exportHTML,
} from "./Canvas";
import { BackendGraph, stepIcons } from "./Backend";
import { ZoomControl } from "./ZoomControl";
import "./styles.css";
const api = async (url, options = {}, token) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-project-token": token } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
};
const initials = (name) =>
  (name || "You")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const relative = (date) => {
  const m = Math.floor((Date.now() - new Date(date)) / 60000);
  return m < 1
    ? "Just now"
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
};
function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? "small" : ""}`}>
      <span className="logo-mark">
        <svg viewBox="0 0 28 28">
          <path d="M4 7l5 14 5-11 5 11 5-14" />
        </svg>
      </span>
      {!small && (
        <span>
          weave<span className="logo-period">.</span>
        </span>
      )}
    </span>
  );
}
function Avatar({ name = "You", color, small = false }) {
  return (
    <span
      title={name}
      className={`avatar ${small ? "avatar-small" : ""}`}
      style={
        color
          ? { background: color + "20", color, borderColor: color + "35" }
          : {}
      }
    >
      {initials(name)}
    </span>
  );
}
function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`icon-button ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} />
    </button>
  );
}
function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const before = document.activeElement;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = [
          ...ref.current.querySelectorAll(
            "button,input,textarea,select,a[href]",
          ),
        ].filter((n) => !n.disabled);
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    (
      ref.current.querySelector("textarea,input") ||
      ref.current.querySelector("button")
    )?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
      >
        <div className="modal-heading">
          <span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </span>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}
function App() {
  const [projects, setProjects] = useState([]),
    [config, setConfig] = useState({ ai: false }),
    [project, setProject] = useState(null),
    [page, setPage] = useState("home"),
    [area, setArea] = useState("frontend"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(null),
    [name, setName] = useState(
      () => localStorage.getItem("weave-name") || "You",
    ),
    [search, setSearch] = useState(""),
    [listView, setListView] = useState(false),
    [newPrompt, setNewPrompt] = useState(""),
    [newName, setNewName] = useState(""),
    [template, setTemplate] = useState("dashboard"),
    [busy, setBusy] = useState(false),
    [peers, setPeers] = useState([]),
    [myId, setMyId] = useState(""),
    [connected, setConnected] = useState(false),
    [selected, setSelected] = useState(null),
    [editTarget, setEditTarget] = useState(null),
    [prompt, setPrompt] = useState(""),
    [editPrompt, setEditPrompt] = useState(""),
    [zoom, setZoom] = useState(0.85),
    [device, setDevice] = useState("desktop"),
    [leftTab, setLeftTab] = useState("layers"),
    [preview, setPreview] = useState(false),
    [runInput, setRunInput] = useState('{\n  "name": "My first project"\n}'),
    [runResult, setRunResult] = useState(null),
    [remoteBusy, setRemoteBusy] = useState("");
  const [canvasHeight, setCanvasHeight] = useState(650);
  const artboardRef = useRef();
  const socket = useRef(),
    canvasRef = useRef(),
    lastCursor = useRef(0),
    toastTimer = useRef();
  const notify = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const updateProject = (p) => {
    setProject(p);
    setProjects((all) => [p, ...all.filter((a) => a.id !== p.id)]);
  };
  const refresh = () =>
    api("/api/projects")
      .then(setProjects)
      .catch((e) => setError(e.message));
  useEffect(() => {
    Promise.all([api("/api/projects"), api("/api/config")])
      .then(([p, c]) => {
        setProjects(p);
        setConfig(c);
        const params = new URLSearchParams(location.search);
        const id = params.get("project");
        if (id) {
          const token = params.get("token");
          const local = p.find((x) => x.id === id);
          api(`/api/projects/${id}`, {}, token || local?.token)
            .then(setProject)
            .catch((e) => setError(e.message));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const pop = () => {
      const id = new URLSearchParams(location.search).get("project");
      if (!id) {
        setProject(null);
        refresh();
      } else {
        api(
          "/api/projects/" + id,
          {},
          new URLSearchParams(location.search).get("token"),
        )
          .then(setProject)
          .catch((e) => setError(e.message));
      }
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!project) {
      setConnected(false);
      setPeers([]);
      return;
    }
    let disposed = false,
      timer;
    const connect = () => {
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/collaborate?project=${project.id}&token=${project.token}&name=${encodeURIComponent(name)}`,
      );
      socket.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        const message = JSON.parse(e.data);
        if (message.type === "welcome") {
          setMyId(message.id);
          updateProject(message.project);
        }
        if (message.type === "project") updateProject(message.project);
        if (message.type === "presence") setPeers(message.peers);
        if (message.type === "cursor")
          setPeers((all) =>
            all.map((p) => (p.id === message.peer.id ? message.peer : p)),
          );
        if (message.type === "generating")
          setRemoteBusy(message.active ? message.actor || "A teammate" : "");
      };
      ws.onclose = () => {
        setConnected(false);
        if (!disposed) timer = setTimeout(connect, 1800);
      };
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socket.current?.close();
    };
  }, [project?.id, name]);
  useEffect(() => {
    if (socket.current?.readyState === 1)
      socket.current.send(JSON.stringify({ type: "selection", id: selected }));
  }, [selected]);
  useEffect(() => {
    setSelected(null);
    setEditTarget(null);
    setRunResult(null);
  }, [area, project?.id]);
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document
          .querySelector(
            project ? ".general-prompt textarea" : ".dashboard-prompt textarea",
          )
          ?.focus();
      }
      if (e.key === "Escape") {
        setEditTarget(null);
        setPreview(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project]);
  useEffect(() => {
    if (!project || !canvasRef.current) return;
    const width = area === "frontend" ? (device === "mobile" ? 390 : 800) : 850;
    setZoom(
      Math.min(
        0.9,
        Math.max(0.2, (canvasRef.current.clientWidth - 60) / width),
      ),
    );
  }, [project?.id, area]);
  useEffect(() => {
    if (!artboardRef.current) return;
    const observer = new ResizeObserver((entries) =>
      setCanvasHeight(entries[0].contentRect.height),
    );
    observer.observe(artboardRef.current);
    return () => observer.disconnect();
  }, [project?.id, area, device]);
  const fitCanvas = () => {
    const viewport = canvasRef.current;
    if (!viewport || !project) return;
    const width =
      area === "frontend"
        ? device === "mobile"
          ? 390
          : 800
        : Math.max(850, ...project.backend.nodes.map((node) => node.x + 300));
    const height =
      area === "frontend"
        ? canvasHeight
        : Math.max(780, ...project.backend.nodes.map((node) => node.y + 160));
    const style = getComputedStyle(viewport);
    const availableWidth =
      viewport.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const availableHeight =
      viewport.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom);
    setZoom(
      Math.max(
        0.1,
        Math.min(1, availableWidth / width, availableHeight / height),
      ),
    );
    viewport.scrollTo({ top: 0, left: 0 });
  };
  const openProject = (p) => {
    setProject(p);
    setArea("frontend");
    setSelected(null);
    setPreview(false);
    setError("");
    history.pushState({}, "", `?project=${p.id}&token=${p.token}`);
  };
  const goHome = () => {
    setProject(null);
    setError("");
    history.pushState({}, "", "/");
    refresh();
  };
  const mutate = async (body) => {
    if (!project) return;
    try {
      const p = await api(
        `/api/projects/${project.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...body,
            actor: name,
            revision: project.revision,
          }),
        },
        project.token,
      );
      updateProject(p);
      return p;
    } catch (e) {
      setError(e.message);
    }
  };
  const generate = async (text, targetId = null) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const p = await api(
        `/api/projects/${project.id}/generate`,
        {
          method: "POST",
          body: JSON.stringify({ prompt: text, targetId, area, actor: name }),
        },
        project.token,
      );
      updateProject(p);
      setPrompt("");
      setEditPrompt("");
      setEditTarget(null);
      notify("Changes applied to your shared canvas");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (!newPrompt.trim() && !newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const inferred = /portfolio|designer/i.test(newPrompt)
        ? "portfolio"
        : /store|shop|commerce/i.test(newPrompt)
          ? "store"
          : template;
      const title =
        newName.trim() ||
        newPrompt
          .replace(/^(build|create|make|design)\s+(me\s+)?(a|an)\s+/i, "")
          .split(" ")
          .slice(0, 4)
          .join(" ")
          .replace(/^./, (s) => s.toUpperCase());
      let p = await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: title || "Untitled project",
          template: inferred,
          prompt: newPrompt,
        }),
      });
      setModal(null);
      openProject(p);
      if (config.ai && newPrompt.trim()) {
        p = await api(
          `/api/projects/${p.id}/generate`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt: newPrompt,
              initial: true,
              actor: name,
            }),
          },
          p.token,
        );
        updateProject(p);
      } else
        notify("Starter created. Double-click any element to make it yours.");
      setNewPrompt("");
      setNewName("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const undo = async () => {
    try {
      updateProject(
        await api(
          `/api/projects/${project.id}/undo`,
          {
            method: "POST",
            body: JSON.stringify({ actor: name, revision: project.revision }),
          },
          project.token,
        ),
      );
      notify("Last shared change undone");
    } catch (e) {
      setError(e.message);
    }
  };
  const duplicate = async (p) => {
    try {
      const copy = await api(
        `/api/projects/${p.id}/duplicate`,
        { method: "POST", body: "{}" },
        p.token,
      );
      setProjects((all) => [copy, ...all]);
      notify("Project duplicated");
    } catch (e) {
      setError(e.message);
    }
  };
  const star = async (p) => {
    try {
      const updated = await api(
        `/api/projects/${p.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ starred: !p.starred, actor: name }),
        },
        p.token,
      );
      setProjects((all) => all.map((a) => (a.id === p.id ? updated : a)));
    } catch (e) {
      setError(e.message);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/?project=${project.id}&token=${project.token}`,
      );
      notify("Invite link copied");
    } catch {
      setError("Copy the invite link from the field below.");
    }
  };
  const download = (filename, text, type = "text/plain") => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const edit = (id) => {
    setSelected(id);
    setEditTarget(id);
    setEditPrompt("");
    setError("");
  };
  const selectedNode =
    project &&
    (area === "frontend"
      ? findNode(project.document, selected)
      : project.backend.nodes.find((n) => n.id === selected));
  const editingNode =
    project &&
    (area === "frontend"
      ? findNode(project.document, editTarget)
      : project.backend.nodes.find((n) => n.id === editTarget));
  const visibleProjects = projects.filter(
    (p) =>
      (page !== "starred" || p.starred) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const runFlow = async () => {
    setBusy(true);
    setError("");
    try {
      const input = JSON.parse(runInput);
      const result = await api(
        `/api/projects/${project.id}/run`,
        { method: "POST", body: JSON.stringify({ input }) },
        project.token,
      );
      setRunResult(result);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Enter valid JSON for the request body."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const addStep = () => {
    const backend = structuredClone(project.backend);
    const end = backend.nodes.find((n) => n.type === "response");
    const edge = backend.edges.find((e) => e.target === end.id);
    const id = crypto.randomUUID();
    backend.nodes.push({
      id,
      type: "transform",
      title: "Format results",
      description: "Wrap your data in a named field",
      x: end.x,
      y: end.y,
      config: { key: "results" },
    });
    edge.target = id;
    backend.edges.push({ source: id, target: end.id });
    end.y += 170;
    mutate({ backend, note: "Added a transform step" }).then((p) => {
      if (p) setSelected(id);
    });
  };
  const deleteStep = () => {
    const backend = structuredClone(project.backend);
    const before = backend.edges.find((e) => e.target === selected),
      after = backend.edges.find((e) => e.source === selected);
    if (!before || !after) return;
    backend.edges = backend.edges.filter(
      (e) => e.source !== selected && e.target !== selected,
    );
    backend.edges.push({ source: before.source, target: after.target });
    backend.nodes = backend.nodes.filter((n) => n.id !== selected);
    mutate({ backend, note: "Removed a backend step" }).then(() =>
      setSelected(null),
    );
  };
  const peerList = peers.length
    ? peers
    : [{ id: "self", name, color: "#0b78b3" }];
  if (loading)
    return (
      <div className="loading-screen">
        <Logo />
        <LoaderCircle className="spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  return (
    <div className={`app ${project ? "editor-app" : "dashboard-app"}`}>
      {!project ? (
        <>
          <aside className="sidebar">
            <div className="sidebar-brand">
              <Logo />
              <span className="beta-tag">BETA</span>
            </div>
            <button
              className="workspace-switch"
              aria-label="Workspace profile"
              onClick={() => setModal("profile")}
            >
              <span className="workspace-avatar">S</span>
              <span>
                <strong>Studio workspace</strong>
                <small>Your creative space</small>
              </span>
              <ChevronDown size={14} />
            </button>
            <div className="sidebar-group">
              <span className="nav-label">WORKSPACE</span>
              {[
                { id: "home", label: "Overview", icon: Home },
                { id: "projects", label: "All projects", icon: Folder },
                { id: "starred", label: "Starred", icon: Star },
                { id: "templates", label: "Templates", icon: Boxes },
              ].map((item) => (
                <button
                  key={item.id}
                  aria-label={item.label}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => {
                    setPage(item.id);
                    setSearch("");
                  }}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.id === "projects" && <em>{projects.length}</em>}
                  {item.id === "templates" && (
                    <span className="new-tag">NEW</span>
                  )}
                </button>
              ))}
            </div>
            <div className="sidebar-group recent-nav">
              <div className="nav-label">
                RECENT PROJECTS{" "}
                <button
                  aria-label="Create project"
                  onClick={() => setModal("new")}
                >
                  <Plus size={14} />
                </button>
              </div>
              {projects.slice(0, 4).map((p, i) => (
                <button
                  key={p.id}
                  className="nav-item"
                  onClick={() => openProject(p)}
                >
                  <span className={`project-dot dot-${i % 3}`} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="sidebar-bottom">
              <div className="collab-note">
                <span className="little-spark">
                  <Sparkles size={17} />
                </span>
                <strong>Better, together.</strong>
                <p>
                  Your next great idea starts
                  <br />
                  with a shared canvas.
                </p>
                <button onClick={() => setModal("help")}>
                  Meet your workspace <ArrowUpRight size={14} />
                </button>
              </div>
              <button className="nav-item" onClick={() => setModal("help")}>
                <CircleHelp size={17} />
                Help & shortcuts
                <ArrowUpRight size={13} />
              </button>
              <button
                className="profile-button"
                aria-label="Edit your profile"
                onClick={() => setModal("profile")}
              >
                <Avatar name={name} />
                <span>
                  <strong>{name}</strong>
                  <small>Personal workspace</small>
                </span>
                <Settings2 size={16} />
              </button>
            </div>
          </aside>
          <main className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span>Workspace</span>
                <ChevronRight size={13} />
                <strong>
                  {
                    {
                      home: "Overview",
                      projects: "All projects",
                      starred: "Starred",
                      templates: "Templates",
                    }[page]
                  }
                </strong>
              </div>
              <div>
                <span className="mode-label">
                  <span className={`status-dot ${config.ai ? "green" : ""}`} />
                  {config.ai ? config.mode : "Demo workspace"}
                </span>
                <IconButton
                  icon={CircleHelp}
                  label="Workspace help"
                  onClick={() => setModal("help")}
                />
                <Avatar name={name} small />
              </div>
            </header>
            <div className="dashboard-content">
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">YOUR IDEAS. OUR PLAYGROUND.</div>
                  <h1>
                    {page === "home"
                      ? `Make room for your next idea.`
                      : page === "templates"
                        ? "A little head start."
                        : page === "starred"
                          ? "The ones you keep close."
                          : "Everything you’re building."}
                  </h1>
                  <p>
                    {page === "home"
                      ? "From a spark to something real. Build it together."
                      : page === "templates"
                        ? "Start with a thoughtful foundation. Make every detail your own."
                        : page === "starred"
                          ? "Your favorite projects, right where you need them."
                          : "One workspace for all your ideas, experiments, and next big things."}
                  </p>
                </div>
                {page !== "templates" && (
                  <button
                    className="primary-button"
                    onClick={() => setModal("new")}
                  >
                    <Plus size={16} />
                    New project
                  </button>
                )}
              </div>
              {page === "home" && (
                <>
                  <div className="dashboard-prompt">
                    <div className="prompt-heading">
                      <span className="prompt-spark">
                        <Sparkles size={19} />
                      </span>
                      <strong>What are we building today?</strong>
                      <span>Start with an idea</span>
                    </div>
                    <textarea
                      aria-label="Describe your new app"
                      placeholder="A dashboard for my startup, a portfolio that feels like me, the next big thing…"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          create();
                        }
                      }}
                    />
                    <div className="prompt-footer">
                      <span>
                        <span className="tiny-orbit">✳</span>
                        {config.ai
                          ? "Powered by AI"
                          : "Demo mode · Start from a smart template"}
                        <ChevronDown size={12} />
                      </span>
                      <button
                        disabled={!newPrompt.trim() || busy}
                        className="primary-button"
                        onClick={create}
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={15} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Create project
                        <ArrowUp size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="suggestions">
                    <span>A little inspiration</span>
                    {[
                      ["dashboard", "A startup dashboard", LayoutDashboard],
                      ["portfolio", "A creative portfolio", MousePointer2],
                      ["store", "An online store", Boxes],
                    ].map(([type, label, Icon]) => (
                      <button
                        key={type}
                        onClick={() => {
                          setTemplate(type);
                          setNewPrompt(`Create ${label.toLowerCase()}`);
                        }}
                      >
                        <Icon size={13} />
                        {label}
                        <ArrowUpRight size={11} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="section-header">
                <div className="section-title">
                  <h2>
                    {page === "templates"
                      ? "Made to make your own"
                      : page === "starred"
                        ? "Starred projects"
                        : page === "projects"
                          ? "All projects"
                          : "Jump back in"}
                  </h2>
                  <span>
                    {page === "templates" ? "3" : visibleProjects.length}
                  </span>
                </div>
                {page !== "templates" && (
                  <div className="project-controls">
                    <div className="search-field">
                      <Search size={14} />
                      <input
                        aria-label="Search projects"
                        placeholder="Search projects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <kbd>⌘ K</kbd>
                    </div>
                    <div className="view-switch">
                      <IconButton
                        icon={Grid2X2}
                        label="Grid view"
                        active={!listView}
                        onClick={() => setListView(false)}
                      />
                      <IconButton
                        icon={List}
                        label="List view"
                        active={listView}
                        onClick={() => setListView(true)}
                      />
                    </div>
                  </div>
                )}
              </div>
              {page === "templates" ? (
                <div className="template-grid">
                  {["dashboard", "portfolio", "store"].map((type, i) => {
                    const p =
                      projects.find((p) => p.template === type) || projects[0];
                    return (
                      <button
                        className="template-card"
                        key={type}
                        onClick={() => {
                          setTemplate(type);
                          setNewName(
                            ["My dashboard", "My portfolio", "My store"][i],
                          );
                          setNewPrompt(
                            [
                              "A calm dashboard for my team",
                              "A thoughtful creative portfolio",
                              "A curated online store",
                            ][i],
                          );
                          setModal("new");
                        }}
                      >
                        {p && <MiniPreview project={p} />}
                        <div>
                          <h3>
                            {
                              [
                                "The clear-headed dashboard",
                                "The creative portfolio",
                                "The considered store",
                              ][i]
                            }
                          </h3>
                          <p>
                            {
                              [
                                "For ideas, metrics, and moving things forward.",
                                "For work that deserves a little spotlight.",
                                "For the things you love to make and sell.",
                              ][i]
                            }
                          </p>
                          <span>
                            Use template <ArrowUpRight size={14} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`project-grid ${listView ? "list-view" : ""}`}>
                  {visibleProjects.map((p) => (
                    <article className="project-card" key={p.id}>
                      <button
                        className="project-thumbnail"
                        aria-label={`Open ${p.name}`}
                        onClick={() => openProject(p)}
                      >
                        <MiniPreview project={p} />
                        <span className="open-project-label">
                          Open project <ArrowUpRight size={14} />
                        </span>
                      </button>
                      <div className="project-card-info">
                        <button
                          className="project-title"
                          onClick={() => openProject(p)}
                        >
                          <span className={`project-icon ${p.template}`}>
                            <FileCode2 size={17} />
                          </span>
                          <div>
                            <h3>{p.name}</h3>
                            <span>Edited {relative(p.updatedAt)}</span>
                          </div>
                        </button>
                        <button
                          className={`star-button ${p.starred ? "starred" : ""}`}
                          aria-label={`${p.starred ? "Unstar" : "Star"} ${p.name}`}
                          onClick={() => star(p)}
                        >
                          <Star
                            size={15}
                            fill={p.starred ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                      <div className="project-card-footer">
                        <span>
                          <span className="status-dot green" />
                          Ready to build
                        </span>
                        <button
                          aria-label={`Duplicate ${p.name}`}
                          title="Duplicate project"
                          onClick={() => duplicate(p)}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!visibleProjects.length && (
                    <div className="empty-state">
                      <Folder size={30} />
                      <h3>
                        {search
                          ? "No matching projects"
                          : "A fresh canvas awaits"}
                      </h3>
                      <p>
                        {search
                          ? "Try another project name."
                          : "Create a project, or star one to find it here."}
                      </p>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setPage("projects");
                          setSearch("");
                        }}
                      >
                        View all projects
                      </button>
                    </div>
                  )}
                </div>
              )}
              {page === "home" && (
                <div className="bottom-feature">
                  <div className="feature-symbol">
                    <MousePointer2 size={25} />
                    <span>
                      <Sparkles size={11} />
                    </span>
                  </div>
                  <div>
                    <strong>A conversation with your canvas.</strong>
                    <p>
                      Double-click anything. Say what you’d change. Make it
                      happen.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      projects[0] ? openProject(projects[0]) : setModal("new")
                    }
                  >
                    Try the editor <ArrowUpRight size={15} />
                  </button>
                </div>
              )}
              <footer className="dashboard-footer">
                <span>
                  <span className="status-dot green" />
                  All systems feeling creative
                </span>
                <span>Made for the way ideas happen.</span>
              </footer>
            </div>
          </main>
        </>
      ) : (
        <>
          <header className="editor-header">
            <button
              className="editor-home"
              aria-label="Back to dashboard"
              onClick={goHome}
            >
              <Logo small />
            </button>
            <div className="header-divider" />
            <button
              className="editor-project-name"
              onClick={() => {
                setNewName(project.name);
                setModal("rename");
              }}
            >
              {project.name}
              <ChevronDown size={13} />
            </button>
            <span className="save-state">
              <span className={`status-dot ${connected ? "green" : "amber"}`} />
              {busy || remoteBusy
                ? "Building…"
                : connected
                  ? "All changes saved"
                  : "Reconnecting…"}
            </span>
            <div className="editor-tabs">
              <button
                className={area === "frontend" ? "active" : ""}
                onClick={() => setArea("frontend")}
              >
                <Monitor size={15} />
                Frontend
              </button>
              <button
                className={area === "backend" ? "active" : ""}
                onClick={() => setArea("backend")}
              >
                <Workflow size={15} />
                Backend
              </button>
            </div>
            <div className="editor-header-right">
              <div className="avatar-stack">
                {peerList.slice(0, 4).map((p) => (
                  <Avatar key={p.id} name={p.name} color={p.color} small />
                ))}
              </div>
              <button
                className="secondary-button share-button"
                onClick={() => setModal("share")}
              >
                <Users size={14} />
                Share
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  area === "backend" ? setModal("run") : setPreview(true)
                }
              >
                <Play size={13} />
                {area === "backend" ? "Test flow" : "Preview"}
              </button>
            </div>
          </header>
          <aside className="editor-sidebar">
            <div className="panel-title">
              <strong>{area === "frontend" ? "Explorer" : "Backend"}</strong>
              <IconButton
                icon={area === "frontend" ? Code2 : Plus}
                label={
                  area === "frontend"
                    ? "Export project"
                    : "Add a transform step"
                }
                onClick={() =>
                  area === "frontend" ? setModal("export") : addStep()
                }
              />
            </div>
            <div className="panel-tabs">
              <button
                className={leftTab === "layers" ? "active" : ""}
                onClick={() => setLeftTab("layers")}
              >
                {area === "frontend" ? "Layers" : "Flow"}
              </button>
              <button
                className={leftTab === "activity" ? "active" : ""}
                onClick={() => setLeftTab("activity")}
              >
                Activity<span>{project.activity.length}</span>
              </button>
            </div>
            {leftTab === "layers" ? (
              <>
                <div className="page-group">
                  <span className="nav-label">
                    {area === "frontend" ? "PAGES" : "WORKFLOWS"}
                  </span>
                  <button className="page-item">
                    <span>
                      {area === "frontend" ? (
                        <LayoutDashboard size={14} />
                      ) : (
                        <Workflow size={14} />
                      )}
                    </span>
                    {area === "frontend" ? "Home" : "Main workflow"}
                    <span className="page-count">1</span>
                  </button>
                </div>
                <div className="layers-heading">
                  <span>{area === "frontend" ? "LAYERS" : "STEPS"}</span>
                  <span>
                    {area === "frontend" ? (
                      <Layers size={12} />
                    ) : (
                      project.backend.nodes.length
                    )}
                  </span>
                </div>
                <div className="layers-list">
                  {area === "frontend" ? (
                    <LayerTree
                      node={project.document}
                      selected={selected}
                      onSelect={setSelected}
                      onEdit={edit}
                    />
                  ) : (
                    project.backend.nodes.map((n) => {
                      const Icon = stepIcons[n.type];
                      return (
                        <button
                          className={`backend-list-item ${selected === n.id ? "active" : ""}`}
                          key={n.id}
                          onClick={() => setSelected(n.id)}
                          onDoubleClick={() => edit(n.id)}
                        >
                          <Icon size={15} />
                          <span>{n.title}</span>
                          <ChevronRight size={12} />
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="activity-list">
                {[...project.activity].reverse().map((a) => (
                  <div className="activity-item" key={a.id}>
                    <Avatar name={a.actor} small />
                    <div>
                      <strong>{a.actor}</strong>
                      <p>{a.text}</p>
                      <small>{relative(a.time)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="editor-sidebar-bottom">
              <span className={`mode-pill ${config.ai ? "ai" : ""}`}>
                <Sparkles size={12} />
                {config.ai ? config.mode : "Demo mode"}
              </span>
              <button onClick={() => setModal("help")}>
                <CircleHelp size={14} />
                <span>How Weave works</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </aside>
          <main className="editor-main">
            <div className="canvas-toolbar">
              <div>
                <span className="canvas-breadcrumb">
                  {area === "frontend" ? (
                    <Monitor size={14} />
                  ) : (
                    <Workflow size={14} />
                  )}
                  <span>{area === "frontend" ? "Home" : "Main workflow"}</span>
                  <ChevronRight size={12} />
                  <span>
                    {area === "frontend" ? "Design canvas" : "Logic canvas"}
                  </span>
                </span>
              </div>
              <div className="canvas-toolbar-actions">
                {area === "frontend" && (
                  <div className="device-switch">
                    <IconButton
                      icon={Monitor}
                      label="Desktop canvas"
                      active={device === "desktop"}
                      onClick={() => setDevice("desktop")}
                    />
                    <IconButton
                      icon={Smartphone}
                      label="Mobile canvas"
                      active={device === "mobile"}
                      onClick={() => {
                        setDevice("mobile");
                        setZoom(1);
                      }}
                    />
                  </div>
                )}
                <div className="toolbar-separator" />
                <ZoomControl
                  key={`${project.id}-${area}`}
                  zoom={zoom}
                  onChange={setZoom}
                  onFit={fitCanvas}
                />
                <IconButton
                  icon={Maximize2}
                  label="Fit canvas"
                  onClick={fitCanvas}
                />
                <IconButton
                  icon={Undo2}
                  label="Undo last shared change"
                  disabled={!project.history.length || busy}
                  onClick={undo}
                />
              </div>
            </div>
            <div
              className="canvas-viewport"
              ref={canvasRef}
              onClick={() => setSelected(null)}
              onPointerMove={(e) => {
                if (
                  Date.now() - lastCursor.current < 45 ||
                  socket.current?.readyState !== 1
                )
                  return;
                lastCursor.current = Date.now();
                const r = e.currentTarget.getBoundingClientRect();
                socket.current.send(
                  JSON.stringify({
                    type: "cursor",
                    x: (e.clientX - r.left) / r.width,
                    y: (e.clientY - r.top) / r.height,
                    area,
                  }),
                );
              }}
            >
              {area === "frontend" ? (
                <div
                  className="artboard-container"
                  style={{ width: (device === "mobile" ? 390 : 800) * zoom }}
                >
                  <div className="artboard-label">
                    <span>
                      Home{" "}
                      <span>· {device === "mobile" ? "390" : "800"} px</span>
                    </span>
                    <span>
                      <span className="status-dot green" />
                      Live canvas
                    </span>
                  </div>
                  <div
                    className="artboard-wrap"
                    style={{
                      width: (device === "mobile" ? 390 : 800) * zoom,
                      height: canvasHeight * zoom,
                    }}
                  >
                    <div
                      ref={artboardRef}
                      className={`artboard ${device === "mobile" ? "mobile-artboard" : ""}`}
                      style={{
                        width: device === "mobile" ? 390 : 800,
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <NodeView
                        node={project.document}
                        selected={selected}
                        onSelect={setSelected}
                        onEdit={edit}
                      />
                    </div>
                  </div>
                  <div className="canvas-hint">
                    <MousePointer2 size={12} />
                    <span>
                      Double-click any element to start a conversation.
                    </span>
                  </div>
                </div>
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  <BackendGraph
                    backend={project.backend}
                    selected={selected}
                    onSelect={setSelected}
                    onEdit={edit}
                    onMove={(node) =>
                      mutate({ backendNode: node, note: `Moved ${node.title}` })
                    }
                    zoom={zoom}
                    trace={runResult?.trace}
                  />
                </div>
              )}
              {peers
                .filter((p) => p.id !== myId && p.cursor && p.area === area)
                .map((p) => (
                  <div
                    className="live-cursor"
                    key={p.id}
                    style={{
                      left: `${p.cursor.x * 100}%`,
                      top: `${p.cursor.y * 100}%`,
                      color: p.color,
                    }}
                  >
                    <MousePointer2 size={19} fill="currentColor" />
                    <span style={{ background: p.color }}>{p.name}</span>
                  </div>
                ))}
            </div>
            <div className="general-prompt">
              <div className="general-prompt-heading">
                <Sparkles size={14} />
                <span>
                  {area === "frontend"
                    ? "Make something happen"
                    : "Build the logic behind it"}
                </span>
                <span className="prompt-scope">
                  Entire {area}
                  <ChevronDown size={10} />
                </span>
              </div>
              <textarea
                aria-label="General prompt"
                placeholder={
                  area === "frontend"
                    ? "Ask Weave to change, add, or imagine something…"
                    : "Describe how your backend should work…"
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generate(prompt);
                  }
                }}
              />
              <div className="general-prompt-footer">
                <button
                  className="context-button"
                  onClick={() => setModal("help")}
                >
                  <Plus size={13} />
                  <span>Prompt tips</span>
                </button>
                <span className="prompt-key">
                  <kbd>⌘ K</kbd> to focus
                </span>
                <button
                  aria-label="Send general prompt"
                  disabled={!prompt.trim() || busy || !!remoteBusy}
                  onClick={() => generate(prompt)}
                  className="send-button"
                >
                  {busy || remoteBusy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ArrowUp size={17} />
                  )}
                </button>
              </div>
            </div>
          </main>
          <aside className="inspector">
            <div className="panel-title">
              <strong>{selectedNode ? "Properties" : "Workspace"}</strong>
              <IconButton
                icon={selectedNode ? X : SlidersHorizontal}
                label={selectedNode ? "Clear selection" : "Project settings"}
                onClick={() =>
                  selectedNode ? setSelected(null) : setModal("rename")
                }
              />
            </div>
            {selectedNode ? (
              <div className="inspector-content" key={selectedNode.id}>
                <div className="inspector-selection">
                  <span className="selected-icon">
                    {area === "frontend" ? (
                      <MousePointer2 size={18} />
                    ) : (
                      <Workflow size={18} />
                    )}
                  </span>
                  <div>
                    <strong>{selectedNode.name || selectedNode.title}</strong>
                    <small>{selectedNode.type} · selected</small>
                  </div>
                </div>
                <button
                  className="edit-with-prompt"
                  onClick={() => edit(selected)}
                >
                  <Sparkles size={14} />
                  Edit with a prompt
                  <ArrowUpRight size={13} />
                </button>
                <div className="property-section">
                  <h4>CONTENT</h4>
                  {area === "frontend" ? (
                    <>
                      <label>
                        Text
                        <textarea
                          defaultValue={selectedNode.text}
                          key={selectedNode.text}
                          onBlur={(e) => {
                            if (e.target.value !== selectedNode.text)
                              mutate({
                                nodeId: selected,
                                text: e.target.value,
                                note: `Updated ${selectedNode.name}`,
                              });
                          }}
                        />
                      </label>
                      <p className="field-help">
                        Changes save when you leave the field.
                      </p>
                    </>
                  ) : (
                    <>
                      <label>
                        Step name
                        <input
                          defaultValue={selectedNode.title}
                          key={selectedNode.title}
                          onBlur={(e) => {
                            if (e.target.value !== selectedNode.title)
                              mutate({
                                backendNode: {
                                  id: selected,
                                  title: e.target.value,
                                },
                              });
                          }}
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          defaultValue={selectedNode.description}
                          key={selectedNode.description}
                          onBlur={(e) => {
                            if (e.target.value !== selectedNode.description)
                              mutate({
                                backendNode: {
                                  id: selected,
                                  description: e.target.value,
                                },
                              });
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="property-section">
                  <h4>
                    {area === "frontend" ? "APPEARANCE" : "CONFIGURATION"}
                  </h4>
                  {area === "frontend" ? (
                    <>
                      <label className="property-row">
                        Background
                        <div className="color-input">
                          <input
                            type="color"
                            aria-label="Element background"
                            value={
                              /^#[a-f0-9]{6}$/i.test(
                                selectedNode.style.background,
                              )
                                ? selectedNode.style.background
                                : "#ffffff"
                            }
                            onChange={(e) =>
                              mutate({
                                nodeId: selected,
                                style: { background: e.target.value },
                              })
                            }
                          />
                          <span>{selectedNode.style.background || "None"}</span>
                        </div>
                      </label>
                      <label className="property-row">
                        Text color
                        <div className="color-input">
                          <input
                            type="color"
                            aria-label="Element text color"
                            value={
                              /^#[a-f0-9]{6}$/i.test(selectedNode.style.color)
                                ? selectedNode.style.color
                                : "#202531"
                            }
                            onChange={(e) =>
                              mutate({
                                nodeId: selected,
                                style: { color: e.target.value },
                              })
                            }
                          />
                          <span>{selectedNode.style.color || "Inherited"}</span>
                        </div>
                      </label>
                      <label className="property-row">
                        Font size
                        <input
                          className="compact-input"
                          aria-label="Font size"
                          defaultValue={
                            parseInt(selectedNode.style.fontSize) || 14
                          }
                          key={selectedNode.style.fontSize}
                          type="number"
                          min="8"
                          max="100"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (
                              v >= 8 &&
                              v <= 100 &&
                              `${v}px` !== selectedNode.style.fontSize
                            )
                              mutate({
                                nodeId: selected,
                                style: { fontSize: `${v}px` },
                              });
                          }}
                        />
                      </label>
                      <label className="property-row">
                        Corner radius
                        <input
                          className="compact-input"
                          aria-label="Corner radius"
                          defaultValue={
                            parseInt(selectedNode.style.borderRadius) || 0
                          }
                          key={selectedNode.style.borderRadius}
                          type="number"
                          min="0"
                          max="100"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (
                              v >= 0 &&
                              v <= 100 &&
                              `${v}px` !== selectedNode.style.borderRadius
                            )
                              mutate({
                                nodeId: selected,
                                style: { borderRadius: `${v}px` },
                              });
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    Object.entries(selectedNode.config).map(([key, value]) => (
                      <label key={key}>
                        {key.replace(/^./, (c) => c.toUpperCase())}
                        {key === "operation" ? (
                          <select
                            value={value}
                            onChange={(e) =>
                              mutate({
                                backendNode: {
                                  id: selected,
                                  config: {
                                    ...selectedNode.config,
                                    [key]: e.target.value,
                                  },
                                },
                              })
                            }
                          >
                            <option>read</option>
                            <option>write</option>
                          </select>
                        ) : (
                          <input
                            defaultValue={value}
                            key={String(value)}
                            onBlur={(e) => {
                              if (String(value) !== e.target.value)
                                mutate({
                                  backendNode: {
                                    id: selected,
                                    config: {
                                      ...selectedNode.config,
                                      [key]:
                                        key === "status"
                                          ? Number(e.target.value)
                                          : e.target.value,
                                    },
                                  },
                                });
                            }}
                          />
                        )}
                      </label>
                    ))
                  )}
                </div>
                {area === "backend" &&
                  !["request", "response"].includes(selectedNode.type) && (
                    <button className="danger-button" onClick={deleteStep}>
                      Remove step
                    </button>
                  )}
                <div className="selection-note">
                  <Users size={14} />
                  <p>
                    Everyone in this project sees your changes as you make them.
                  </p>
                </div>
              </div>
            ) : (
              <div className="inspector-content">
                <div className="workspace-illustration">
                  <span className="illustration-box one">
                    <MousePointer2 size={19} />
                  </span>
                  <span className="illustration-box two">
                    <Sparkles size={20} />
                  </span>
                  <span className="illustration-dot" />
                </div>
                <h3 className="inspector-intro">Big ideas. Small prompts.</h3>
                <p className="inspector-description">
                  Select an{" "}
                  {area === "frontend" ? "element" : "individual step"} to
                  explore its details, or double-click to make it your own.
                </p>
                <div className="tip-steps">
                  <div>
                    <span>1</span>
                    <p>Find something to change</p>
                  </div>
                  <div>
                    <span>2</span>
                    <p>Double-click and describe it</p>
                  </div>
                  <div>
                    <span>3</span>
                    <p>Watch your idea take shape</p>
                  </div>
                </div>
                <div className="property-section">
                  <h4>
                    IN THIS WORKSPACE{" "}
                    <span className="online-count">
                      {peerList.length} online
                    </span>
                  </h4>
                  {peerList.map((p) => (
                    <div className="peer-row" key={p.id}>
                      <Avatar name={p.name} color={p.color} small />
                      <span>
                        {p.name}
                        {(p.id === myId || p.id === "self") && (
                          <small> (you)</small>
                        )}
                      </span>
                      <span className="status-dot green" />
                    </div>
                  ))}
                  <button
                    className="invite-row"
                    onClick={() => setModal("share")}
                  >
                    <span>
                      <Plus size={13} />
                    </span>
                    Invite a collaborator
                  </button>
                </div>
                <div className="property-section">
                  <h4>PROJECT DETAILS</h4>
                  <div className="detail-row">
                    <span>Last updated</span>
                    <span>{relative(project.updatedAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Shared revision</span>
                    <span>v{project.revision + 1}</span>
                  </div>
                  <div className="detail-row">
                    <span>Backend steps</span>
                    <span>{project.backend.nodes.length}</span>
                  </div>
                </div>
                <div className="inspector-callout">
                  <span>✳</span>
                  <p>
                    A little nudge goes a long way.
                    <br />
                    <strong>Try “make it blue”.</strong>
                  </p>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
      {error && (
        <div role="alert" className="error-banner">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
      {modal === "new" && (
        <Modal
          title="A new idea starts here."
          subtitle="Give it a name, a little direction, and room to grow."
          onClose={() => setModal(null)}
        >
          <label className="modal-label">
            Project name
            <input
              placeholder="Something wonderful"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <label className="modal-label">
            What would you like to build?
            <textarea
              placeholder="Describe your app and who it’s for…"
              rows={4}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
          </label>
          <span className="modal-label">Start with a foundation</span>
          <div className="template-options">
            {["dashboard", "portfolio", "store"].map((t) => (
              <button
                className={template === t ? "active" : ""}
                key={t}
                onClick={() => setTemplate(t)}
              >
                {t === "dashboard" ? (
                  <LayoutDashboard size={20} />
                ) : t === "portfolio" ? (
                  <MousePointer2 size={20} />
                ) : (
                  <Boxes size={20} />
                )}
                <span>{t[0].toUpperCase() + t.slice(1)}</span>
                {template === t && <Check size={12} />}
              </button>
            ))}
          </div>
          {!config.ai && (
            <p className="modal-note">
              Demo mode creates a starter template. Connect a local Ollama model
              or add a server API key to generate apps from your prompts.
            </p>
          )}
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={busy || (!newPrompt.trim() && !newName.trim())}
              onClick={create}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              Create project
            </button>
          </div>
        </Modal>
      )}
      {modal === "profile" && (
        <Modal
          title="Make yourself at home."
          subtitle="Choose the name your collaborators will see."
          onClose={() => setModal(null)}
        >
          <label className="modal-label">
            Display name
            <input
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="profile-preview">
            <Avatar name={name} />
            <span>
              {name || "Your name"}
              <small>Shared workspace member</small>
            </span>
          </div>
          <div className="modal-actions">
            <button
              className="primary-button"
              disabled={!name.trim()}
              onClick={() => {
                localStorage.setItem("weave-name", name.trim());
                setModal(null);
                notify("Profile updated");
              }}
            >
              Save profile
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Meet your creative workspace."
          subtitle="A few small moves. A world of possibilities."
          onClose={() => setModal(null)}
        >
          <div className="help-items">
            <div>
              <MousePointer2 />
              <span>
                <strong>Point. Prompt. Make it yours.</strong>
                <p>
                  Double-click a canvas element or backend step to edit just
                  that part. Press Enter on a focused element to do the same.
                </p>
              </span>
            </div>
            <div>
              <Sparkles />
              <span>
                <strong>Think bigger with a general prompt.</strong>
                <p>
                  The bottom prompt bar changes the entire frontend or backend.
                  ⌘/Ctrl K focuses it; Enter sends, Shift Enter adds a line.
                </p>
              </span>
            </div>
            <div>
              <Users />
              <span>
                <strong>Bring someone into the idea.</strong>
                <p>
                  Share a project link. Teammates on the same server can edit
                  together, see cursors, and follow the activity feed.
                </p>
              </span>
            </div>
            <div>
              <Workflow />
              <span>
                <strong>Make the logic visible.</strong>
                <p>
                  Drag steps by their grip. Configure validation and storage,
                  add transforms, and test the flow with real JSON input.
                </p>
              </span>
            </div>
          </div>
          <div className="help-demo">
            <strong>
              {config.ai
                ? `${config.mode} is configured`
                : "You’re in demo mode"}
            </strong>
            <p>
              {config.ai
                ? config.provider === "ollama"
                  ? `Using ${config.model} through Ollama on this Mac. Prompts stay on the local server. The first response can take longer while the model loads.`
                  : "Your server is configured for OpenAI generation. Prompts are sent to the configured model."
                : 'Try “make it blue”, “make it bigger”, “add more spacing”, or Change text to "Hello world". For local AI, set AI_PROVIDER=ollama in code/.env and start Ollama. Alternatively, set OPENAI_API_KEY for OpenAI. Restart Weave after configuration changes.'}
            </p>
          </div>
        </Modal>
      )}
      {modal === "rename" && project && (
        <Modal title="Project settings" onClose={() => setModal(null)}>
          <label className="modal-label">
            Project name
            <input
              value={newName || project.name}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              className="primary-button"
              onClick={async () => {
                if (await mutate({ name: newName || project.name }))
                  setModal(null);
              }}
            >
              Save changes
            </button>
          </div>
        </Modal>
      )}
      {modal === "share" && project && (
        <Modal
          title={`Build ${project.name} together.`}
          subtitle="Good ideas get better with a little company."
          onClose={() => setModal(null)}
        >
          <div className="share-access">
            <span>
              <Link size={20} />
            </span>
            <div>
              <strong>Anyone with the link can edit</strong>
              <p>For people you trust, on this workspace server.</p>
            </div>
            <span className="access-tag">Editor</span>
          </div>
          <label className="modal-label">
            Project invite link
            <div className="copy-field">
              <input
                readOnly
                value={`${location.origin}/?project=${project.id}&token=${project.token}`}
                onFocus={(e) => e.target.select()}
              />
              <button onClick={copyLink}>
                <Copy size={15} />
              </button>
            </div>
          </label>
          <p className="modal-note">
            For another device, open Weave using this computer’s network address
            before copying the link. Localhost links only work on this computer.
          </p>
          <label className="modal-label">
            Your display name
            <input
              maxLength={40}
              defaultValue={name}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  setName(e.target.value.trim());
                  localStorage.setItem("weave-name", e.target.value.trim());
                }
              }}
            />
          </label>
          <div className="share-members">
            {peerList.map((p) => (
              <div className="peer-row" key={p.id}>
                <Avatar name={p.name} color={p.color} />
                <span>{p.name}</span>
                <small>Editing now</small>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="primary-button" onClick={copyLink}>
              <Link size={14} />
              Copy invite link
            </button>
          </div>
        </Modal>
      )}
      {editTarget && editingNode && (
        <Modal
          title={`Let’s rethink ${editingNode.name || editingNode.title}.`}
          subtitle={`Your prompt applies only to this ${area === "frontend" ? "element" : "backend step"}.`}
          onClose={() => setEditTarget(null)}
        >
          <div className="scope-chip">
            <MousePointer2 size={12} />
            {editingNode.name || editingNode.title}
            <span>Selected {editingNode.type}</span>
          </div>
          <textarea
            autoFocus
            className="edit-prompt-input"
            aria-label="Element edit prompt"
            rows={4}
            placeholder={
              area === "frontend"
                ? "Make it feel a little more…"
                : "Describe what this step should do…"
            }
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                generate(editPrompt, editTarget);
              }
            }}
          />
          <div className="prompt-chips">
            {(area === "frontend"
              ? ["Make it blue", "Make it bigger", "Add more spacing"]
              : [
                  'Rename to "Process request"',
                  editingNode.type === "database"
                    ? "Save records"
                    : 'Rename to "Check input"',
                ]
            ).map((p) => (
              <button key={p} onClick={() => setEditPrompt(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="modal-actions">
            <span className="modal-note">
              {config.ai ? config.mode : "Demo edits available"}
            </span>
            <button
              className="primary-button"
              disabled={!editPrompt.trim() || busy || !!remoteBusy}
              onClick={() => generate(editPrompt, editTarget)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              Apply change
            </button>
          </div>
        </Modal>
      )}
      {modal === "run" && project && (
        <Modal
          title="Give your flow a test run."
          subtitle="Runs your configured steps with persisted local data."
          onClose={() => setModal(null)}
          wide
        >
          <div className="run-grid">
            <div>
              <label className="modal-label">
                Request body · JSON
                <textarea
                  className="code-input"
                  rows={10}
                  value={runInput}
                  onChange={(e) => setRunInput(e.target.value)}
                />
              </label>
              <p className="modal-note">
                Database writes are saved to this project’s collection. Read
                steps return its saved records.
              </p>
            </div>
            <div>
              <span className="modal-label">
                Response{" "}
                {runResult && (
                  <span
                    className={
                      runResult.status < 400 ? "success-label" : "failure-label"
                    }
                  >
                    {runResult.status}
                  </span>
                )}
              </span>
              <pre className="response-output">
                {runResult
                  ? JSON.stringify(runResult.data, null, 2)
                  : "Run your flow to see the response here."}
              </pre>
            </div>
          </div>
          {runResult && (
            <div className="run-trace">
              {runResult.trace.map((t) => (
                <span key={t.id} className={t.state}>
                  {t.state === "success" ? (
                    <Check size={12} />
                  ) : (
                    <X size={12} />
                  )}{" "}
                  {t.title}
                </span>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setModal(null)}>
              Back to canvas
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={runFlow}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Play size={15} />
              )}
              Run flow
            </button>
          </div>
        </Modal>
      )}
      {modal === "export" && project && (
        <Modal
          title="Take your idea with you."
          subtitle="Download your design and backend configuration."
          onClose={() => setModal(null)}
        >
          <div className="export-options">
            <button
              onClick={() =>
                download(
                  project.name + ".html",
                  exportHTML(project),
                  "text/html",
                )
              }
            >
              <FileCode2 />
              <span>
                <strong>Frontend HTML</strong>
                <small>Static layout and content; charts export as text</small>
              </span>
              <Download size={17} />
            </button>
            <button
              onClick={() =>
                download(
                  project.name + ".json",
                  JSON.stringify(
                    {
                      name: project.name,
                      document: project.document,
                      backend: project.backend,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              <Braces />
              <span>
                <strong>Project source</strong>
                <small>Full canvas tree and backend flow definition</small>
              </span>
              <Download size={17} />
            </button>
          </div>
        </Modal>
      )}
      {preview && project && (
        <div className="preview-overlay">
          <header>
            <button onClick={() => setPreview(false)}>
              <ArrowLeft size={16} />
              Back to editor
            </button>
            <strong>
              {project.name}
              <span>Interactive design preview</span>
            </strong>
            <button
              onClick={() => {
                setPreview(false);
                setModal("export");
              }}
            >
              <Download size={16} />
              Export
            </button>
          </header>
          <div className="preview-body">
            <NodeView node={project.document} preview />
          </div>
          <span className="preview-caption">
            Design preview · Generated controls are visual components
          </span>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
