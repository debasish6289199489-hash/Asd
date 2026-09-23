import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Music, Volume2, VolumeX, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSite, logout, me } from "@/lib/app.functions";

export function useSite() {
  return useQuery({ queryKey: ["site"], queryFn: () => getSite() });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => me() });
}

export function Brand({
  logo,
  name,
  sub,
}: {
  logo?: string | undefined;
  name?: string | undefined;
  sub?: string | undefined;
}) {
  return (
    <Link to="/" className="flex items-center gap-3">
      {logo ? (
        <img src={logo} alt={name ?? "logo"} className="size-9 rounded-full object-cover glow" />
      ) : (
        <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          BG
        </div>
      )}
      <div className="leading-none">
        <div className="display text-lg text-foreground">{name ?? "BOSS GAGAN"}</div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-primary">
          {sub ?? "LEVEL UP PANEL"}
        </div>
      </div>
    </Link>
  );
}

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  const { data } = useSite();
  const s = data?.settings ?? {};
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Brand logo={s["logo_url"]} name={s["brand_name"]} sub={s["brand_sub"]} />
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function LogoutButton() {
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await logout();
        navigate({ to: "/auth", reloadDocument: true });
      }}
    >
      <LogOut className="size-4" /> Logout
    </Button>
  );
}

export function SiteFooter() {
  const { data } = useSite();
  const s = data?.settings ?? {};
  const tg = s["telegram_username"] ?? "BOSSXGAGAN";
  return (
    <footer className="mt-16 border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} {s["brand_name"] ?? "BOSS GAGAN"} ·{" "}
      {s["footer_text"] ?? "Free Fire Level Up Service"} ·{" "}
      <a
        className="text-primary hover:underline"
        href={`https://t.me/${tg}`}
        target="_blank"
        rel="noreferrer"
      >
        @{tg}
      </a>
    </footer>
  );
}

export function BroadcastBar() {
  const { data } = useSite();
  const list = data?.broadcasts ?? [];
  if (!list.length) return null;
  return (
    <div className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto max-w-6xl overflow-hidden px-4 py-2 text-sm text-primary">
        <div className="whitespace-nowrap">📢 {list.map((b) => b.message).join("   •   ")}</div>
      </div>
    </div>
  );
}

/** Background music with a user-controlled on/off switch (default off). */
export function MusicPlayer() {
  const { data } = useSite();
  const url = data?.settings?.["music_url"] ?? "";
  const enabled = data?.settings?.["music_enabled"] === "true";
  const ref = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOn(window.localStorage.getItem("bg_music") === "on");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (on) void el.play().catch(() => setOn(false));
    else el.pause();
  }, [on, url]);

  if (!url || !enabled) return null;

  return (
    <>
      <audio ref={ref} src={url} loop preload="none" />
      <button
        type="button"
        aria-label={on ? "Music off" : "Music on"}
        onClick={() => {
          const next = !on;
          setOn(next);
          window.localStorage.setItem("bg_music", next ? "on" : "off");
        }}
        className="fixed right-4 bottom-4 z-50 grid size-12 place-items-center rounded-full border border-primary/50 bg-card text-primary glow"
      >
        {on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        <Music className="sr-only" />
      </button>
    </>
  );
}
