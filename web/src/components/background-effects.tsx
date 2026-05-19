"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function BackgroundEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const HOME_MAX_BLUR = 12;
    const HOME_SCROLL_RANGE = 700;

    const updateBlur = () => {
      if (pathname === "/") {
        const progress = Math.min(window.scrollY / HOME_SCROLL_RANGE, 1);
        const blur = progress * HOME_MAX_BLUR;
        root.style.setProperty("--dither-blur", `${blur.toFixed(2)}px`);
      } else {
        root.style.setProperty("--dither-blur", "12px");
      }
    };

    updateBlur();
    window.addEventListener("scroll", updateBlur, { passive: true });
    window.addEventListener("resize", updateBlur);

    return () => {
      window.removeEventListener("scroll", updateBlur);
      window.removeEventListener("resize", updateBlur);
      root.style.removeProperty("--dither-blur");
    };
  }, [pathname]);

  return null;
}
