import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BroadcastBar,
  LogoutButton,
  MusicPlayer,
  SiteFooter,
  SiteHeader,
  useMe,
} from "@/components/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { botAction, myBots, startLevelUp } from "@/lib/app.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — BOSS GAGAN Level Up Panel" },
      { name: "description", content: "Apne Free Fire accounts ka live level, EXP aur matches dekho." },
      { property: "og:title", content: "My Dashboard — BOSS GAGAN Level Up Panel" },
      { property: "og:description", content: "Level up start karo aur live progress track karo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function countdown(to: string) {
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "EXPIRED";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${d}D ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function elapsed(from: string) {
  const ms = Math.max(0, Date.now() - new Date(from).getTime());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="gap-1 p-4">
      <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`display text-2xl ${accent ? "text-primary text-glow" : ""}`}>{value}</div>
    </Card>
  );
}

function Dashboard() {
  useTick();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meData, isLoading } = useMe();
  const user = meData?.user ?? null;

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/auth" });
  }, [isLoading, user, navigate]);

  const bots = useQuery({
    queryKey: ["bots"],
    queryFn: () => myBots({ data: { refresh: true } }),
    enabled: !!user,
    refetchInterval: 45_000,
  });

  const [mode, setMode] = useState<"uid" | "token">("uid");
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const start = useMutation({
    mutationFn: () =>
      startLevelUp({
        data: mode === "uid" ? { uid, password } : { token },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Level up start ho gaya");
      setUid("");
      setPassword("");
      setToken("");
      void qc.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: () => toast.error("Service busy hai, dubara try karo"),
  });

  const act = useMutation({
    mutationFn: (v: { code: string; action: "start" | "stop" | "delete" | "refresh" }) =>
      botAction({ data: v }),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error);
      void qc.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: () => toast.error("Action fail hua"),
  });

  if (!user) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;

  const list = bots.data?.bots ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <>
            {user.is_owner && (
              <Button asChild size="sm" variant="outline">
                <Link to="/bg-owner-2026">Owner</Link>
              </Button>
            )}
            <LogoutButton />
          </>
        }
      />
      <BroadcastBar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-4xl">
          Hello <span className="text-primary text-glow">{user.username}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Sirf aapke apne Free Fire accounts yahan dikhte hain.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="TOTAL SLOTS" value={String(user.slots)} />
          <Stat label="IDS ADDED" value={`${list.length} / ${user.slots}`} />
          <Stat label="PLAN EXPIRY" value={countdown(user.expires_at)} accent />
        </div>

        <Card className="mt-6 gap-4 border-primary/30 p-5">
          <h2 className="text-2xl">Start level up</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "uid" ? "default" : "outline"}
              onClick={() => setMode("uid")}
            >
              UID + PASSWORD
            </Button>
            <Button
              size="sm"
              variant={mode === "token" ? "default" : "outline"}
              onClick={() => setMode("token")}
            >
              ACCESS TOKEN
            </Button>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              start.mutate();
            }}
          >
            {mode === "uid" ? (
              <>
                <Input
                  placeholder="Free Fire UID"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  required
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            ) : (
              <Input
                className="sm:col-span-2"
                placeholder="Access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            )}
            <Button
              type="submit"
              disabled={start.isPending}
              className="font-bold tracking-widest sm:col-span-2 sm:w-40"
            >
              {start.isPending ? "STARTING…" : "START NOW"}
            </Button>
          </form>
        </Card>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-3xl">Your IDs</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["bots"] })}
          >
            REFRESH ALL
          </Button>
        </div>

        {list.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Abhi koi ID add nahi hui. Upar se start karo.
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {list.map((b) => (
            <Card key={b.id} className="gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="display text-xl">{b.player || "—"}</div>
                  <div className="text-xs text-muted-foreground">UID {b.uid}</div>
                </div>
                <Badge
                  variant={b.status === "RUNNING" ? "default" : "secondary"}
                  className="tracking-widest"
                >
                  {b.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">LEVEL </span>
                  <b>{b.level}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">EXP </span>
                  <b>{b.exp}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">MATCHES </span>
                  <b>{b.matches}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">TIMER </span>
                  <b className="text-primary">{elapsed(b.started_at)}</b>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-[10px] tracking-[0.2em] text-muted-foreground">
                    TOTAL LEVEL GAIN
                  </div>
                  <div className="display text-2xl text-primary">+{b.level - b.start_level}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.start_level} → {b.level}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-[10px] tracking-[0.2em] text-muted-foreground">
                    TOTAL EXP GAIN
                  </div>
                  <div className="display text-2xl text-primary">
                    +{(b.exp - b.start_exp).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.start_exp.toLocaleString()} → {b.exp.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["refresh", "start", "stop", "delete"] as const).map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={a === "start" ? "default" : a === "delete" ? "destructive" : "outline"}
                    disabled={act.isPending}
                    onClick={() => act.mutate({ code: b.code, action: a })}
                  >
                    {a.toUpperCase()}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
      <MusicPlayer />
    </div>
  );
}
