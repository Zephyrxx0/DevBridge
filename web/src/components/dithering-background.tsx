"use client";

import { Suspense, lazy } from "react";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export function DitheringBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
        {/* Keep this wrapper free of `dither-bg`; global styles for that class darken landing visuals. */}
        <div
          className="absolute inset-0 z-0 opacity-40 mix-blend-multiply transition-[filter] duration-200 dark:opacity-30 dark:mix-blend-screen"
          style={{ filter: "blur(var(--dither-blur, 0px))" }}
        >
          <Dithering
            colorBack="#00000000"
            colorFront="#EC4E02"
            shape="warp"
            type="4x4"
            speed={0.2}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </Suspense>
    </div>
  );
}
