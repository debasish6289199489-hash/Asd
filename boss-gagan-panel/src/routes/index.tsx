import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, Plus, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";

import {
  BroadcastBar,
  MusicPlayer,
  SiteFooter,
  SiteHeader,
  useSite,
} from "@/components/site";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BOSS GAGAN — Free Fire Level Up Service" },
      {
        name: "description",
        content:
          "Free Fire level up service: plan lo, private dashboard se apne IDs ka live EXP, level aur matches track karo.",
      },
      { property: "og:title", content: "BOSS GAGAN — Free Fire Level Up Service" },
      {
        property: "og:description",
        content: "Fast, safe aur fully automatic Free Fire level up panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

type Plan = {
  id: string;
  name: string;
  price: number;
  days: number;
  slots: number;
  extra_slot_price: number;
};

function buyLink(tg: string, template: string, plan: Plan, slots: number) {
  const extra = Math.max(0, slots - plan.slots) * plan.extra_slot_price;
  const total = plan.price + extra;
  const msg = (template || "Hello {owner}, mujhe {plan} lena hai. Total {total} INR")
    .replaceAll("{owner}", `@${tg}`)
    .replaceAll("{plan}", plan.name)
    .replaceAll("{days}", String(plan.days))
    .replaceAll("{price}", String(plan.price))
    .replaceAll("{slots}", String(slots))
    .replaceAll("{total}", String(total));
  return `https://t.me/${tg}?text=${encodeURIComponent(msg)}`;
}

function PlanCard({ plan, tg, template }: { plan: Plan; tg: string; template: string }) {
  const [slots, setSlots] = useState(plan.slots);
  return (
    <Card className="gap-4 border-primary/25 p-5 transition hover:border-primary/60">
      <div className="text-[11px] font-bold tracking-[0.25em] text-primary">{plan.name}</div>
      <div className="display text-5xl leading-none">₹{plan.price}</div>
      <p className="text-sm text-muted-foreground">{plan.days} Day Level Up Access</p>
      <ul className="space-y-1.5 text-sm">
        {["No ban*", "No blacklist*", "Customer support", `${plan.slots} slot included · extra slot ₹${plan.extra_slot_price}`].map(
          (f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> {f}
            </li>
          ),
        )}
      </ul>
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground">SLOTS</span>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            onClick={() => setSlots((s) => Math.max(plan.slots, s - 1))}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-6 text-center font-bold">{slots}</span>
          <Button size="icon" className="size-7" onClick={() => setSlots((s) => s + 1)}>
            <Plus className="size-3" />
          </Button>
        </div>
      </div>
      <Button asChild className="w-full font-bold tracking-wider">
        <a href={buyLink(tg, template, plan, slots)} target="_blank" rel="noreferrer">
          BUY NOW
        </a>
      </Button>
    </Card>
  );
}

function Landing() {
  const { data } = useSite();
  const s = data?.settings ?? {};
  const tg = s["telegram_username"] ?? "BOSSXGAGAN";

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <>
            <Button asChild size="sm" variant="outline">
              <a href={`https://t.me/${tg}`} target="_blank" rel="noreferrer">
                @{tg}
              </a>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          </>
        }
      />
      <BroadcastBar />

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-primary">
            FREE FIRE LEVEL UP SERVICE
          </p>
          <h1 className="mt-3 text-5xl leading-[0.95] md:text-6xl">
            {s["hero_title"] ?? "LEVEL UP FAST, SAFE & FULLY AUTOMATIC"}
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{s["hero_text"]}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="font-bold tracking-wider">
              <a href="#plans">SEE PLANS</a>
            </Button>
            <Button asChild variant="outline" className="font-bold tracking-wider">
              <Link to="/auth">MEMBER LOGIN</Link>
            </Button>
          </div>
          <div className="mt-6 flex gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="size-4 text-primary" /> Fast start
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> Safe process
            </span>
          </div>
        </div>
        {s["hero_url"] ? (
          <img
            src={s["hero_url"]}
            alt="brand"
            className="mx-auto w-full max-w-sm rounded-2xl border border-primary/40 object-cover glow"
          />
        ) : (
          <div className="mx-auto grid aspect-square w-full max-w-sm place-items-center rounded-2xl border border-primary/40 bg-card glow">
            <span className="display text-4xl text-primary">{s["brand_name"] ?? "BOSS GAGAN"}</span>
          </div>
        )}
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-center text-4xl">Choose your plan</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Buy Now dabate hi Telegram par package message auto type ho jayega.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.plans ?? []).map((p) => (
            <PlanCard key={p.id} plan={p as Plan} tg={tg} template={s["buy_template"] ?? ""} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-3xl">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            "Plan choose karke Buy Now dabao — Telegram par message chala jayega.",
            "Owner payment ke baad aapka username & password banayega.",
            "Login karke dashboard se UID/password ya token daal kar level up start karo.",
          ].map((t, i) => (
            <Card key={t} className="gap-2 p-5">
              <div className="display text-3xl text-primary">0{i + 1}</div>
              <p className="text-sm text-muted-foreground">{t}</p>
            </Card>
          ))}
        </div>
      </section>

      <SiteFooter />
      <MusicPlayer />
    </div>
  );
}
