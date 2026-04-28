"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        window.location.assign("/signin");
        return;
      }

      setEmail(user.email ?? "");
      const metadata = user.user_metadata ?? {};
      setBio((metadata.bio as string) ?? "");
      setLocation((metadata.location as string) ?? "");
      setWebsite((metadata.website as string) ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error("Not authenticated");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: userError } = await supabase.auth.updateUser({
        data: {
          bio,
          location,
          website,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
      });
      if (userError) throw userError;

      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-4xl p-8 text-sm text-[var(--foreground-muted)]">Loading profile...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Card className="border-white/10 bg-[color-mix(in_oklab,var(--surface-1)_70%,transparent)] backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="font-heading text-3xl">Edit Profile</CardTitle>
          <p className="text-sm text-[var(--foreground-muted)]">Manage your account details and public profile info.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSave}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            {message ? <p className="text-sm text-[var(--accent-warm)]">{message}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
