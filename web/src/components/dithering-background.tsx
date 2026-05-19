"use client";

import { Suspense, lazy, useMemo } from "react";
import { useTheme } from "next-themes";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export function DitheringBackground() {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const { colorBack, colorFront } = useMemo(
    () =>
      isDark
        ? { colorBack: "#0B2133", colorFront: "#B3F6E2" }
        : { colorBack: "#F4FFFB", colorFront: "#2F796A" },
    [isDark],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
        <div
          className="absolute inset-0 z-0 opacity-40 mix-blend-multiply transition-[filter] duration-200 dark:opacity-30 dark:mix-blend-screen"
          style={{ filter: "blur(var(--dither-blur, 0px))" }}
        >
          <Dithering
            colorBack={colorBack}
            colorFront={colorFront}
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
