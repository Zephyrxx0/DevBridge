"use client";

import { Suspense, lazy } from "react";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export function DitheringBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_-10%,var(--brand-glow),transparent_55%)]" />
      <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
        <div className="dither-bg absolute inset-0 mix-blend-multiply dark:mix-blend-screen">
          <Dithering
            colorBack="#00000000"
            colorFront="#EC4E02"
            shape="warp"
            type="4x4"
            speed={0.22}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </Suspense>
    </div>
  );
}
