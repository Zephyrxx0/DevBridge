"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SectionRevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Animation variant */
  animation?: "fade-up" | "fade-in" | "slide-up" | "scale-in";
  /** Delay in ms */
  delay?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** Whether to stagger direct children */
  stagger?: boolean;
  /** Stagger interval in ms */
  staggerInterval?: number;
};

export function SectionReveal({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  threshold = 0.15,
  stagger = false,
  staggerInterval = 80,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const animationClass = {
    "fade-up": "animate-fade-up",
    "fade-in": "animate-fade-in",
    "slide-up": "animate-slide-up",
    "scale-in": "animate-scale-in",
  }[animation];

  if (stagger) {
    return (
      <div ref={ref} className={cn(className)}>
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className={cn(
                  "opacity-0",
                  isVisible && animationClass
                )}
                style={{
                  animationDelay: isVisible
                    ? `${delay + i * staggerInterval}ms`
                    : undefined,
                }}
              >
                {child}
              </div>
            ))
          : (
            <div
              className={cn("opacity-0", isVisible && animationClass)}
              style={{ animationDelay: isVisible ? `${delay}ms` : undefined }}
            >
              {children}
            </div>
          )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0",
        isVisible && animationClass,
        className
      )}
      style={{ animationDelay: isVisible ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
