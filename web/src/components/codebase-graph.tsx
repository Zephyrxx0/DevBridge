"use client";

import { useEffect, useRef, useCallback } from "react";

/* ─── Demo data ─── */

interface GraphNode {
  id: string;
  label: string;
  group: string;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: number;
  target: number;
}

const DEMO_NODES: Omit<GraphNode, "x" | "y" | "vx" | "vy">[] = [
  { id: "api/main.py", label: "main.py", group: "api", size: 18 },
  { id: "api/routes.py", label: "routes.py", group: "api", size: 14 },
  { id: "api/auth.py", label: "auth.py", group: "api", size: 12 },
  { id: "core/orchestrator.py", label: "orchestrator.py", group: "core", size: 22 },
  { id: "core/retrieval.py", label: "retrieval.py", group: "core", size: 16 },
  { id: "core/ingestion.py", label: "ingestion.py", group: "core", size: 15 },
  { id: "core/embeddings.py", label: "embeddings.py", group: "core", size: 13 },
  { id: "models/schema.py", label: "schema.py", group: "models", size: 14 },
  { id: "models/annotation.py", label: "annotation.py", group: "models", size: 12 },
  { id: "web/page.tsx", label: "page.tsx", group: "web", size: 16 },
  { id: "web/chat.tsx", label: "chat.tsx", group: "web", size: 14 },
  { id: "web/map.tsx", label: "map.tsx", group: "web", size: 13 },
  { id: "web/search.tsx", label: "search.tsx", group: "web", size: 11 },
  { id: "infra/pubsub.py", label: "pubsub.py", group: "infra", size: 11 },
  { id: "infra/storage.py", label: "storage.py", group: "infra", size: 10 },
  { id: "pr/review.py", label: "review.py", group: "pr", size: 14 },
  { id: "pr/webhook.py", label: "webhook.py", group: "pr", size: 11 },
];

const DEMO_EDGES: GraphEdge[] = [
  { source: 0, target: 1 },
  { source: 0, target: 2 },
  { source: 1, target: 3 },
  { source: 3, target: 4 },
  { source: 3, target: 5 },
  { source: 4, target: 6 },
  { source: 5, target: 6 },
  { source: 5, target: 13 },
  { source: 5, target: 14 },
  { source: 4, target: 7 },
  { source: 8, target: 7 },
  { source: 9, target: 10 },
  { source: 9, target: 11 },
  { source: 9, target: 12 },
  { source: 10, target: 3 },
  { source: 11, target: 4 },
  { source: 12, target: 4 },
  { source: 15, target: 3 },
  { source: 15, target: 16 },
  { source: 16, target: 1 },
  { source: 8, target: 15 },
];

const GROUP_COLORS: Record<string, string> = {
  api: "#EC4E02",
  core: "#FF7A33",
  models: "#FFB088",
  web: "#F06030",
  infra: "#C74400",
  pr: "#E85D1A",
};

/* ─── Physics constants ─── */

const REPULSION = 4000;
const ATTRACTION = 0.006;
const DAMPING = 0.88;
const CENTER_GRAVITY = 0.008;
const REST_LENGTH = 100;

export function CodebaseGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const hoveredRef = useRef<number>(-1);
  const dragRef = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });
  const initializedRef = useRef(false);

  /* Initialize nodes with positions spread from center */
  const initNodes = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    nodesRef.current = DEMO_NODES.map((n, i) => {
      const angle = (i / DEMO_NODES.length) * Math.PI * 2;
      const radius = 40 + Math.random() * 60;
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
  }, []);

  /* Physics tick */
  const tick = useCallback((w: number, h: number) => {
    const nodes = nodesRef.current;
    const cx = w / 2;
    const cy = h / 2;

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of DEMO_EDGES) {
      const a = nodes[edge.source];
      const b = nodes[edge.target];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - REST_LENGTH) * ATTRACTION;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity + damping + position update
    for (const node of nodes) {
      node.vx += (cx - node.x) * CENTER_GRAVITY;
      node.vy += (cy - node.y) * CENTER_GRAVITY;
      node.vx *= DAMPING;
      node.vy *= DAMPING;

      // Don't move dragged node
      if (dragRef.current && nodes[dragRef.current.idx] === node) continue;

      node.x += node.vx;
      node.y += node.vy;

      // Boundary clamping
      const pad = 30;
      node.x = Math.max(pad, Math.min(w - pad, node.x));
      node.y = Math.max(pad, Math.min(h - pad, node.y));
    }
  }, []);

  /* Draw frame */
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
    const nodes = nodesRef.current;
    const hovered = hoveredRef.current;

    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Edges
    for (const edge of DEMO_EDGES) {
      const a = nodes[edge.source];
      const b = nodes[edge.target];
      const isHighlighted = hovered === edge.source || hovered === edge.target;

      // Distance pulsing effect on highlighted edges
      if (isHighlighted) {
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -(Date.now() / 30) % 20;
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHighlighted
        ? "rgba(236, 78, 2, 0.8)"
        : "rgba(236, 78, 2, 0.15)";
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw distance text on highlighted edges
      if (isHighlighted) {
        const dist = Math.round(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "rgba(236, 78, 2, 0.9)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${dist}px`, mx, my - 6);
      }
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isHovered = hovered === i;
      const isConnected = hovered >= 0 && DEMO_EDGES.some(
        (e) => (e.source === hovered && e.target === i) || (e.target === hovered && e.source === i)
      );
      const color = GROUP_COLORS[node.group] || "#EC4E02";
      const radius = node.size * (isHovered ? 1.4 : 1);

      // Simple Node circle (no glow or inner highlight)
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? color : isConnected ? color + "CC" : color + "88";
      ctx.fill();
      if (isHovered || isConnected) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Label
      if (isHovered || isConnected) {
        ctx.font = `500 ${isHovered ? 12 : 10}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background
        const labelText = node.label;
        const metrics = ctx.measureText(labelText);
        const lx = node.x - metrics.width / 2 - 4;
        const ly = node.y + radius + 6;
        const lw = metrics.width + 8;
        const lh = 16;

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, 4);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, node.x, ly + 2);
      }
    }

    ctx.restore();
  }, []);

  /* Hit-test */
  const getNodeAt = useCallback((mx: number, my: number): number => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const dx = mx - nodes[i].x;
      const dy = my - nodes[i].y;
      if (dx * dx + dy * dy <= (nodes[i].size + 4) ** 2) return i;
    }
    return -1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      if (!initializedRef.current) {
        initNodes(rect.width, rect.height);
        initializedRef.current = true;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    /* Mouse events */
    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getPos(e);
      mouseRef.current = pos;

      if (dragRef.current) {
        const node = nodesRef.current[dragRef.current.idx];
        node.x = pos.x - dragRef.current.offsetX;
        node.y = pos.y - dragRef.current.offsetY;
        node.vx = 0;
        node.vy = 0;
      } else {
        const idx = getNodeAt(pos.x, pos.y);
        hoveredRef.current = idx;
        canvas.style.cursor = idx >= 0 ? "grab" : "default";
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const pos = getPos(e);
      const idx = getNodeAt(pos.x, pos.y);
      if (idx >= 0) {
        dragRef.current = {
          idx,
          offsetX: pos.x - nodesRef.current[idx].x,
          offsetY: pos.y - nodesRef.current[idx].y,
        };
        canvas.style.cursor = "grabbing";
      }
    };

    const onMouseUp = () => {
      dragRef.current = null;
      canvas.style.cursor = hoveredRef.current >= 0 ? "grab" : "default";
    };

    const onMouseLeave = () => {
      hoveredRef.current = -1;
      dragRef.current = null;
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);

    /* Animation loop */
    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      tick(rect.width, rect.height);
      draw(ctx, rect.width, rect.height, dpr);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [initNodes, tick, draw, getNodeAt]);

  return (
    <div className="relative h-[300px] w-full rounded-2xl border border-border bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        {Object.entries(GROUP_COLORS).map(([group, color]) => (
          <span
            key={group}
            className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-sm"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {group}
          </span>
        ))}
      </div>
    </div>
  );
}
