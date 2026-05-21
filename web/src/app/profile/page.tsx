"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Link2, MapPin, Pencil, Upload, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { BackgroundEffects } from "@/components/background-effects";
import { DitheringBackground } from "@/components/dithering-background";
import { FloatingHeader } from "@/components/floating-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [pronouns, setPronouns] = useState("Don't specify");
  const [company, setCompany] = useState("");
  const [social1, setSocial1] = useState("");
  const [social2, setSocial2] = useState("");
  const [social3, setSocial3] = useState("");
  const [social4, setSocial4] = useState("");

  useEffect(() => {
    if (!avatarFiles.length) return;
    const file = avatarFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [avatarFiles]);

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
      setUsername((metadata.username as string) ?? (metadata.user_name as string) ?? "");
      setBio((metadata.bio as string) ?? "");
      setLocation((metadata.location as string) ?? "");
      setWebsite((metadata.website as string) ?? "");
      setPronouns((metadata.pronouns as string) ?? "Don't specify");
      setCompany((metadata.company as string) ?? "");
      setSocial1((metadata.social_1 as string) ?? "");
      setSocial2((metadata.social_2 as string) ?? "");
      setSocial3((metadata.social_3 as string) ?? "");
      setSocial4((metadata.social_4 as string) ?? "");

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
          username,
          pronouns,
          company,
          social_1: social1,
          social_2: social2,
          social_3: social3,
          social_4: social4,
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
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-[var(--foreground-muted)]">
        Loading profile...
      </main>
    );
  }

  return (
    <div className="relative min-h-dvh text-[var(--foreground)] selection:bg-[var(--brand-muted)] selection:text-[var(--foreground)]">
      <BackgroundEffects />
      <DitheringBackground />
      <div className="relative pt-6">
        <FloatingHeader />
      </div>
      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-5xl items-start px-0 pt-10 pb-12">
        <Card className="mx-auto w-full border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_78%,transparent)] shadow-xl backdrop-blur-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div>
                <CardTitle className="font-heading text-3xl">{isEditing ? "Edit Profile" : "Profile"}</CardTitle>
              </div>
              <div className="ml-auto">
                <Button type="button" variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing((prev) => !prev)} className="gap-2">
                  <Pencil className="size-4" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
				{!isEditing ? (
					<div className="grid gap-6">
					<div className="grid gap-4 md:grid-cols-[1fr_280px]">
							<div className="space-y-4">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Username</p>
                                  <p className="mt-1 text-sm">{username || "Not set"}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Name</p>
                                  <p className="mt-1 text-lg font-medium">{fullName || "Not set"}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Email</p>
                                  <p className="mt-1 text-sm">{email || "Not set"}</p>
                                </div>
								<div>
									<p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Bio</p>
									<p className="mt-1 text-sm text-[var(--foreground-muted)]">{bio || "Tell us a little bit about yourself"}</p>
								</div>
							</div>
							<div className="grid place-items-start pt-1">
								<div className="h-64 w-64 overflow-hidden rounded-full border border-[var(--border)]">
									<Image src={avatarUrl || "https://placehold.co/320x320/png"} alt="Profile" width={256} height={256} className="h-full w-full object-cover" />
								</div>
							</div>
						</div>
						<Separator />
						<div>
							<p className="mb-2 text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Personal</p>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
								<p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Pronouns</p>
								<p className="mt-1 text-sm">{pronouns || "Don't specify"}</p>
							</div>
							<div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
								<p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Website</p>
								<p className="mt-1 text-sm">{website || "Not set"}</p>
							</div>
							<div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
								<p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Company</p>
								<p className="mt-1 text-sm">{company || "Not set"}</p>
							</div>
							<div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
								<p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Location</p>
								<p className="mt-1 text-sm">{location || "Not set"}</p>
							</div>
						</div>
						<Separator />
						<div>
							<p className="mb-2 text-xs uppercase tracking-wide text-[var(--foreground-muted)]">Social</p>
							<div className="grid gap-2">
								{[social1, social2, social3, social4].map((social, index) => (
									<div key={index} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-2 text-sm text-[var(--foreground-muted)]">
										<Link2 className="size-3.5" />
										<span>{social || `Link to social profile ${index + 1}`}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
				<form className="grid gap-4" onSubmit={handleSave}>
					<div className="grid gap-4 md:grid-cols-[340px_1fr]">
						<div className="grid max-w-sm gap-3">
							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input id="email" value={email ?? ""} disabled />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="fullName">Full Name</Label>
								<Input id="fullName" value={fullName ?? ""} onChange={(e) => setFullName(e.target.value)} />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="username">Username</Label>
								<Input id="username" value={username ?? ""} onChange={(e) => setUsername(e.target.value)} />
							</div>
						</div>
						<div className="grid justify-items-end gap-3">
							<div className="relative h-72 w-72">
								<div className="h-72 w-72 overflow-hidden rounded-full border border-[var(--border)]">
									<Image src={avatarUrl || "https://placehold.co/360x360/png"} alt="Avatar preview" width={288} height={288} className="h-full w-full object-cover" />
								</div>
								<div className="absolute right-5 bottom-5">
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => setAvatarDialogOpen(true)}
										className="size-14 rounded-full border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--brand-hover)]"
									>
										<Pencil className="size-6" />
									</Button>
								</div>
							</div>
						</div>
					</div>
					<Separator />
					<div className="grid gap-2">
						<Label htmlFor="bio">Bio</Label>
						<textarea
							id="bio"
							value={bio ?? ""}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Tell us a little bit about yourself"
							className="min-h-24 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none ring-0 placeholder:text-[var(--foreground-muted)] focus:border-[var(--border)] focus:outline-none"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="pronouns">Pronouns</Label>
						<select
							id="pronouns"
							value={pronouns}
							onChange={(e) => setPronouns(e.target.value)}
							className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--brand)]"
						>
							<option>Don&apos;t specify</option>
							<option>he/him</option>
							<option>she/her</option>
							<option>they/them</option>
						</select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="website">URL</Label>
						<Input id="website" value={website ?? ""} onChange={(e) => setWebsite(e.target.value)} />
					</div>
					<Separator />
					<div className="grid gap-2">
						<Label>Social</Label>
						<div className="grid gap-2">
							<div className="flex items-center gap-2"><Link2 className="size-4 text-[var(--foreground-muted)]" /><Input value={social1 ?? ""} onChange={(e) => setSocial1(e.target.value)} placeholder="Link to social profile 1" /></div>
							<div className="flex items-center gap-2"><Link2 className="size-4 text-[var(--foreground-muted)]" /><Input value={social2 ?? ""} onChange={(e) => setSocial2(e.target.value)} placeholder="Link to social profile 2" /></div>
							<div className="flex items-center gap-2"><Link2 className="size-4 text-[var(--foreground-muted)]" /><Input value={social3 ?? ""} onChange={(e) => setSocial3(e.target.value)} placeholder="Link to social profile 3" /></div>
							<div className="flex items-center gap-2"><Link2 className="size-4 text-[var(--foreground-muted)]" /><Input value={social4 ?? ""} onChange={(e) => setSocial4(e.target.value)} placeholder="Link to social profile 4" /></div>
						</div>
					</div>
					<Separator />
					<div className="grid gap-2 md:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="company">Company</Label>
							<div className="flex items-center gap-2"><Building2 className="size-4 text-[var(--foreground-muted)]" /><Input id="company" value={company ?? ""} onChange={(e) => setCompany(e.target.value)} /></div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="location">Location</Label>
							<div className="flex items-center gap-2"><MapPin className="size-4 text-[var(--foreground-muted)]" /><Input id="location" value={location ?? ""} onChange={(e) => setLocation(e.target.value)} /></div>
						</div>
					</div>
					<Button type="submit" disabled={saving} className="mt-2">{saving ? "Saving..." : "Save changes"}</Button>
					{message ? <p className="text-sm text-[var(--accent-warm)]">{message}</p> : null}
                </form>
              )}
            </CardContent>
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
              <DialogContent className="max-w-[min(92vw,980px)] min-h-[520px] border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-1)_78%,transparent)] backdrop-blur-xl sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Profile Picture</DialogTitle>
                  <DialogDescription>Upload from file or choose an URL.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Upload image</Label>
                    <FileUpload
                      maxFiles={1}
                      maxSize={5 * 1024 * 1024}
                      className="w-full max-w-none"
                      value={avatarFiles}
                      onValueChange={setAvatarFiles}
                      onFileReject={(file, rejectMessage) => {
                        const shortName = file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name;
                        setMessage(`${rejectMessage} (${shortName})`);
                      }}
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    >
                      <FileUploadDropzone>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div className="flex items-center justify-center rounded-full border p-2.5">
                            <Upload className="size-6 text-muted-foreground" />
                          </div>
                          <p className="font-medium text-sm">Drag & drop files here</p>
                          <p className="text-muted-foreground text-xs">Or click to browse (max 1 file, up to 5MB)</p>
                        </div>
                        <FileUploadTrigger asChild>
                          <Button variant="outline" size="sm" className="mt-2 w-fit">
                            Browse files
                          </Button>
                        </FileUploadTrigger>
                      </FileUploadDropzone>
                      <FileUploadList>
                        {avatarFiles.map((file, index) => (
                          <FileUploadItem key={`${file.name}-${index}`} value={file}>
                            <FileUploadItemPreview />
                            <FileUploadItemMetadata />
                            <FileUploadItemDelete asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <X className="size-4" />
                              </Button>
                            </FileUploadItemDelete>
                          </FileUploadItem>
                        ))}
                      </FileUploadList>
                    </FileUpload>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="avatarUrlInput">Image URL</Label>
                    <Input id="avatarUrlInput" value={avatarUrl ?? ""} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setAvatarDialogOpen(false)}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </Card>
      </main>
    </div>
  );
}
