import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { MusicPlayer, SiteFooter, SiteHeader, useSite } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/app.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Member Login — BOSS GAGAN Level Up Panel" },
      { name: "description", content: "Apne level up dashboard me login karo." },
      { property: "og:title", content: "Member Login — BOSS GAGAN Level Up Panel" },
      { property: "og:description", content: "Owner se mila username-password daal kar login karo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const { data } = useSite();
  const tg = data?.settings?.["telegram_username"] ?? "BOSSXGAGAN";
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login({ data: { username, password } });
      if (!res.ok) toast.error(res.error);
      else navigate({ to: "/dashboard", reloadDocument: true });
    } catch {
      toast.error("Kuch galat ho gaya, dubara try karo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-14">
        <Card className="w-full max-w-sm border-primary/30 p-6 glow">
          <h1 className="text-3xl">Member login</h1>
          <p className="-mt-2 text-sm text-muted-foreground">
            Account owner se milega. Free access nahi hai.
          </p>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest">USERNAME</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest">PASSWORD</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full font-bold tracking-widest">
              {busy ? "..." : "LOGIN"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Account nahi hai?{" "}
            <a
              className="text-primary hover:underline"
              href={`https://t.me/${tg}`}
              target="_blank"
              rel="noreferrer"
            >
              Telegram par owner se lein
            </a>
          </p>
        </Card>
      </main>
      <SiteFooter />
      <MusicPlayer />
    </div>
  );
}
