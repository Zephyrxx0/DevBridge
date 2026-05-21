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
        ? { colorBack: "#06100a", colorFront: "#054114" }
        : { colorBack: "#f0fdfa", colorFront: "#065f46" },
    [isDark],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Suspense fallback={<div className="absolute inset-0 bg-background" />}>
        <div
          className="absolute inset-0 z-0 transition-[filter] duration-200 "
          style={{ filter: "blur(var(--dither-blur, 0px))" }}
        >
          <Dithering
            colorBack={colorBack}
            colorFront={colorFront}
            shape="warp"
            type="4x4"
            speed={0.08}
            className="size-full"
            minPixelRatio={1}
          />
        </div >
        <div className="absolute inset-0 z-10 bg-black/15" />
      </Suspense>
    </div>
  );
}
