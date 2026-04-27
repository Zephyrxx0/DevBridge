"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function BackgroundEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    const updateBlur = () => {
      const shouldBlur = pathname !== "/" || window.scrollY > 80;
      root.classList.toggle("dither-blur", shouldBlur);
      root.classList.add("dither-transition");
    };

    updateBlur();
    window.addEventListener("scroll", updateBlur, { passive: true });
    window.addEventListener("resize", updateBlur);

    return () => {
      window.removeEventListener("scroll", updateBlur);
      window.removeEventListener("resize", updateBlur);
    };
  }, [pathname]);

  return null;
}
