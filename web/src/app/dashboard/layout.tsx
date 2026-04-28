import { FloatingHeader } from "@/components/floating-header";
import { BackgroundEffects } from "@/components/background-effects";
import { DitheringBackground } from "@/components/dithering-background";
import { Footer } from "@/components/footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh text-[var(--foreground)] selection:bg-white/30 selection:text-white">
      <BackgroundEffects />
      <DitheringBackground />
      <div className="relative pt-6">
        <FloatingHeader />
      </div>
      <main className="relative z-10 flex min-h-[calc(100dvh-120px)] flex-col px-4 pt-12 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {children}
        </div>
      </main>
      <div className="relative z-10 bg-background">
        <Footer />
      </div>
    </div>
  );
}
