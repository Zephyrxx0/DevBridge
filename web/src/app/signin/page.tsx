"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";
import { BackgroundEffects } from "@/components/background-effects";
import { DitheringBackground } from "@/components/dithering-background";
import { FloatingHeader } from "@/components/floating-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

export default function SignInPage() {
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const oauthProviders = [
    { id: "google", enabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true", label: "Continue with Google" },
    { id: "gitlab", enabled: process.env.NEXT_PUBLIC_GITLAB_AUTH_ENABLED === "true", label: "Continue with GitLab" },
    { id: "github", enabled: process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === "true", label: "Continue with GitHub" },
  ] as const;

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Signup successful. Check your email to confirm your account.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Authentication failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "gitlab" | "github") => {
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  };

  return (
    <div className="relative min-h-dvh text-[var(--foreground)] selection:bg-white/30 selection:text-white">
      <BackgroundEffects />
      <DitheringBackground />
      <div className="relative pt-6">
        <FloatingHeader />
      </div>
      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-5xl items-center justify-center px-4 py-10 md:px-8">
        <Card className="w-full max-w-md border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_62%,transparent)] shadow-[0_24px_90px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="font-heading text-3xl">{mode === "login" ? "Welcome back" : "Create account"}</CardTitle>
                <p className="text-sm text-[var(--foreground-muted)]">Use email/password or continue with SSO.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="border-white/10 bg-[color-mix(in_oklab,var(--surface-2)_25%,transparent)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <Sun className="hidden size-4 dark:block" />
                <Moon className="block size-4 dark:hidden" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleEmailAuth}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processing..." : mode === "login" ? "Login" : "Sign up"}
              </Button>
            </form>

            <div className="space-y-2">
              {oauthProviders.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!provider.enabled}
                  onClick={() => handleOAuth(provider.id)}
                >
                  {provider.label}
                </Button>
              ))}
            </div>

            <div className="text-sm text-[var(--foreground-muted)]">
              {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-[var(--brand)] underline-offset-4 hover:underline"
              >
                {mode === "login" ? "Sign up" : "Login"}
              </button>
            </div>

            {message ? <p className="text-sm text-[var(--accent-warm)]">{message}</p> : null}

            <p className="text-xs text-[var(--foreground-subtle)]">
              By continuing, you agree to mock terms and mock pricing. <Link href="/pricing" className="underline">View pricing</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
