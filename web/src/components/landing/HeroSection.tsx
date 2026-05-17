"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";

const Dithering = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.Dithering),
  { ssr: false }
);

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden px-6 pb-20 pt-28 md:px-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_12%,var(--brand-glow),transparent_72%)]" />
        <div className="absolute inset-0 opacity-30 mix-blend-screen">
          <Dithering
            colorBack="#00000000"
            colorFront="#EC4E02"
            shape="warp"
            type="4x4"
            speed={0.18}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mb-4 rounded-full border border-white/12 bg-[color-mix(in_oklab,var(--surface-1)_45%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-subtle)]"
        >
          Modern Premium Polish
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.06 }}
          className="font-heading text-[var(--text-hero)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground"
        >
          Learn any codebase
          <br />
          <span className="text-foreground/80">with grounded answers.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
          className="mt-6 max-w-2xl text-[var(--text-body-lg)] leading-[1.7] text-muted-foreground"
        >
          DevBridge helps new engineers understand repositories faster through grounded chat, code citations, and a living repo map.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Link href="/repo/demo">
            <Button size="lg" className="h-14 rounded-full px-10 text-base font-medium" aria-label="Start Building">
              Start Building
              <ArrowRight className="size-5" />
            </Button>
          </Link>
          <Link href="/repo/demo/map">
            <Button
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-white/15 bg-[color-mix(in_oklab,var(--surface-1)_30%,transparent)] px-10 text-base"
            >
              View Repo Map
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
