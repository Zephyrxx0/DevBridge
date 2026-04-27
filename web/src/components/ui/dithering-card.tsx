"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type DitheringCardProps = {
  className?: string;
  contentClassName?: string;
  density?: number;
  speed?: number;
  children?: React.ReactNode;
};

export function DitheringCard({
  className,
  contentClassName,
  density = 0.18,
  speed = 0.8,
  children,
}: DitheringCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const seedRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const noise = (x: number, y: number, t: number) => {
      const seed = seedRef.current ?? 0;
      const n = Math.sin((x * 12.9898 + y * 78.233 + t * 0.25 + seed) * 0.075) * 43758.5453;
      return n - Math.floor(n);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const step = 4;
      const t = tRef.current;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const n1 = noise(x, y, t);
          const n2 = noise(x * 0.5, y * 0.5, t + 50);
          const n3 = noise(x * 0.08, y * 0.08, t + 80);
          const pulse = (Math.sin((x + y) * 0.018 + t * 0.45) + 1) * 0.5;
          const value = n1 * 0.55 + n2 * 0.25 + n3 * 0.2;
          const threshold = 1 - density + pulse * 0.16;

          if (value > threshold) {
            const alpha = 0.12 + (value - threshold) * 0.95;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(alpha, 0.28)})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      tRef.current += 0.02 * speed;
      frameRef.current = requestAnimationFrame(draw);
    };

    if (seedRef.current === null) {
      seedRef.current = Math.random() * 1000;
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [density, speed]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--brand-muted)] bg-[var(--surface-1)]",
        "shadow-[0_0_0_1px_var(--brand-muted),0_0_80px_var(--brand-glow)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow-brand)]" />
      <canvas
        aria-hidden
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen opacity-85"
      />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </section>
  );
}
