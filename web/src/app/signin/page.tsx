"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

export default function SignInPage() {
  const supabase = createClient();
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
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-white/15 bg-[color-mix(in_oklab,var(--surface-1)_70%,transparent)] shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-3xl">{mode === "login" ? "Welcome back" : "Create account"}</CardTitle>
          <p className="text-sm text-[var(--foreground-muted)]">Use email/password or continue with SSO.</p>
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
  );
}
