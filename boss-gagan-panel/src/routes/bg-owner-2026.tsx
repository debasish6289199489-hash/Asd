import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LogoutButton, SiteHeader, useMe } from "@/components/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  botAction,
  ownerBroadcast,
  ownerData,
  ownerPlan,
  ownerSettings,
  ownerUpload,
  ownerUser,
} from "@/lib/app.functions";

export const Route = createFileRoute("/bg-owner-2026")({
  head: () => ({
    meta: [
      { title: "Owner Panel — BOSS GAGAN Level Up Panel" },
      { name: "description", content: "Users, plans, bots aur website settings manage karo." },
      { property: "og:title", content: "Owner Panel — BOSS GAGAN Level Up Panel" },
      { property: "og:description", content: "Private owner control panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Owner,
});

const SETTING_FIELDS: [string, string][] = [
  ["telegram_username", "Telegram username (@ ke bina)"],
  ["brand_name", "Brand name"],
  ["brand_sub", "Brand tagline"],
  ["hero_title", "Hero title"],
  ["hero_text", "Hero text"],
  ["footer_text", "Footer text"],
  ["buy_template", "Buy message template"],
  ["music_url", "Music URL"],
  ["music_enabled", "Music on? (true / false)"],
];

function FileField({
  label,
  settingKey,
  accept,
  onDone,
}: {
  label: string;
  settingKey: string;
  accept: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs tracking-widest">{label}</Label>
      <Input
        type="file"
        accept={accept}
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const buf = new Uint8Array(await file.arrayBuffer());
            let bin = "";
            for (const byte of buf) bin += String.fromCharCode(byte);
            const res = await ownerUpload({
              data: {
                name: file.name,
                type: file.type,
                base64: btoa(bin),
                settingKey,
              },
            });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Upload ho gaya");
              onDone();
            }
          } catch {
            toast.error("Upload fail hua (file chhoti rakho)");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

function Owner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meData, isLoading } = useMe();
  const user = meData?.user ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!user.is_owner) navigate({ to: "/dashboard" });
  }, [isLoading, user, navigate]);

  const info = useQuery({
    queryKey: ["owner"],
    queryFn: () => ownerData(),
    enabled: !!user?.is_owner,
  });
  const reload = () => {
    void qc.invalidateQueries({ queryKey: ["owner"] });
    void qc.invalidateQueries({ queryKey: ["site"] });
  };

  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ ok: boolean; error?: string }>) => fn(),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error ?? "Fail");
      else {
        toast.success("Done");
        reload();
      }
    },
    onError: () => toast.error("Action fail hua"),
  });

  const [nu, setNu] = useState({ username: "", password: "", slots: 1, days: 1 });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [bc, setBc] = useState("");

  useEffect(() => {
    if (info.data?.settings) setSettings(info.data.settings);
  }, [info.data?.settings]);

  if (!user?.is_owner) return <div className="grid min-h-screen place-items-center">Loading…</div>;

  const d = info.data;

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <LogoutButton />
          </>
        }
      />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <h1 className="text-4xl">Owner panel</h1>

        <Card className="gap-4 border-primary/30 p-5">
          <h2 className="text-2xl">Create user account</h2>
          <form
            className="grid gap-3 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate(() => ownerUser({ data: { action: "create", ...nu } }));
              setNu({ username: "", password: "", slots: 1, days: 1 });
            }}
          >
            <Input
              placeholder="Username"
              value={nu.username}
              onChange={(e) => setNu({ ...nu, username: e.target.value })}
              required
            />
            <Input
              placeholder="Password"
              value={nu.password}
              onChange={(e) => setNu({ ...nu, password: e.target.value })}
              required
            />
            <Input
              type="number"
              min={1}
              placeholder="Slots"
              value={nu.slots}
              onChange={(e) => setNu({ ...nu, slots: Number(e.target.value) })}
            />
            <Input
              type="number"
              min={1}
              placeholder="Days"
              value={nu.days}
              onChange={(e) => setNu({ ...nu, days: Number(e.target.value) })}
            />
            <Button type="submit" className="font-bold tracking-widest">
              CREATE
            </Button>
          </form>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-2xl">Users ({d?.users.length ?? 0})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[10px] tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="p-2">USER</th>
                  <th className="p-2">SLOTS</th>
                  <th className="p-2">EXPIRY</th>
                  <th className="p-2">STATUS</th>
                  <th className="p-2">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(d?.users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-2 font-semibold">{u.username}</td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        min={1}
                        defaultValue={u.slots}
                        onBlur={(e) =>
                          Number(e.target.value) !== u.slots &&
                          run.mutate(() =>
                            ownerUser({
                              data: { action: "slots", id: u.id, slots: Number(e.target.value) },
                            }),
                          )
                        }
                      />
                    </td>
                    <td className="p-2 text-xs">{new Date(u.expires_at).toLocaleString()}</td>
                    <td className="p-2">
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "ACTIVE" : "DISABLED"}
                      </Badge>
                    </td>
                    <td className="flex flex-wrap gap-1.5 p-2">
                      {[1, 3, 15, 30].map((days) => (
                        <Button
                          key={days}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            run.mutate(() =>
                              ownerUser({ data: { action: "extend", id: u.id, days } }),
                            )
                          }
                        >
                          +{days}d
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run.mutate(() => ownerUser({ data: { action: "toggle", id: u.id } }))
                        }
                      >
                        {u.is_active ? "DISABLE" : "ENABLE"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const password = window.prompt(`Naya password for ${u.username}`);
                          if (password)
                            run.mutate(() =>
                              ownerUser({ data: { action: "password", id: u.id, password } }),
                            );
                        }}
                      >
                        PASS
                      </Button>
                      {!u.is_owner && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`${u.username} delete karna hai?`))
                              run.mutate(() =>
                                ownerUser({ data: { action: "delete", id: u.id } }),
                              );
                          }}
                        >
                          DEL
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-2xl">All IDs ({d?.bots.length ?? 0})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[10px] tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="p-2">OWNER</th>
                  <th className="p-2">PLAYER</th>
                  <th className="p-2">UID</th>
                  <th className="p-2">LEVEL</th>
                  <th className="p-2">STATUS</th>
                  <th className="p-2">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(d?.bots ?? []).map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2">{b.owner}</td>
                    <td className="p-2">{b.player}</td>
                    <td className="p-2">{b.uid}</td>
                    <td className="p-2">{b.level}</td>
                    <td className="p-2">{b.status}</td>
                    <td className="flex gap-1.5 p-2">
                      {(["start", "stop", "delete"] as const).map((a) => (
                        <Button
                          key={a}
                          size="sm"
                          variant={a === "delete" ? "destructive" : "outline"}
                          onClick={() =>
                            run.mutate(() => botAction({ data: { code: b.code, action: a } }))
                          }
                        >
                          {a.toUpperCase()}
                        </Button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-2xl">Pricing plans</h2>
          {(d?.plans ?? []).map((p) => (
            <form
              key={p.id}
              className="grid gap-2 border-t border-border pt-3 sm:grid-cols-7"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run.mutate(() =>
                  ownerPlan({
                    data: {
                      action: "save",
                      id: p.id,
                      name: String(f.get("name")),
                      price: Number(f.get("price")),
                      days: Number(f.get("days")),
                      slots: Number(f.get("slots")),
                      extra_slot_price: Number(f.get("extra")),
                      sort_order: Number(f.get("sort")),
                    },
                  }),
                );
              }}
            >
              <Input name="name" defaultValue={p.name} placeholder="Name" />
              <Input name="price" type="number" defaultValue={p.price} placeholder="₹" />
              <Input name="days" type="number" defaultValue={p.days} placeholder="Days" />
              <Input name="slots" type="number" defaultValue={p.slots} placeholder="Slots" />
              <Input
                name="extra"
                type="number"
                defaultValue={p.extra_slot_price}
                placeholder="Extra slot ₹"
              />
              <Input name="sort" type="number" defaultValue={p.sort_order} placeholder="Order" />
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  SAVE
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => run.mutate(() => ownerPlan({ data: { action: "delete", id: p.id } }))}
                >
                  DEL
                </Button>
              </div>
            </form>
          ))}
          <Button
            variant="outline"
            className="w-40"
            onClick={() =>
              run.mutate(() =>
                ownerPlan({
                  data: {
                    action: "save",
                    name: "NEW PLAN",
                    price: 99,
                    days: 1,
                    slots: 1,
                    extra_slot_price: 50,
                    sort_order: (d?.plans.length ?? 0) + 1,
                  },
                }),
              )
            }
          >
            + ADD PLAN
          </Button>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-2xl">Broadcast</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate(() => ownerBroadcast({ data: { action: "add", message: bc } }));
              setBc("");
            }}
          >
            <Input placeholder="Notice message" value={bc} onChange={(e) => setBc(e.target.value)} />
            <Button type="submit">ADD</Button>
          </form>
          <div className="space-y-2">
            {(d?.broadcasts ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
              >
                <span>{b.message}</span>
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run.mutate(() => ownerBroadcast({ data: { action: "toggle", id: b.id } }))
                    }
                  >
                    {b.is_active ? "HIDE" : "SHOW"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      run.mutate(() => ownerBroadcast({ data: { action: "delete", id: b.id } }))
                    }
                  >
                    DEL
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-2xl">Website settings</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FileField label="Logo image" settingKey="logo_url" accept="image/*" onDone={reload} />
            <FileField label="Hero image" settingKey="hero_url" accept="image/*" onDone={reload} />
            <FileField
              label="Music file (mp3)"
              settingKey="music_url"
              accept="audio/*"
              onDone={reload}
            />
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => run.mutate(() => ownerSettings({ data: { values: { logo_url: "" } } }))}
              >
                REMOVE LOGO
              </Button>
              <Button
                variant="outline"
                onClick={() => run.mutate(() => ownerSettings({ data: { values: { music_url: "" } } }))}
              >
                REMOVE MUSIC
              </Button>
            </div>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate(() => ownerSettings({ data: { values: settings } }));
            }}
          >
            {SETTING_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs tracking-widest">{label}</Label>
                <Input
                  value={settings[key] ?? ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              </div>
            ))}
            <Button type="submit" className="w-40 font-bold tracking-widest sm:col-span-2">
              SAVE SETTINGS
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Buy template me ye placeholders use karo: {"{owner} {plan} {days} {price} {slots} {total}"}
          </p>
        </Card>
      </main>
    </div>
  );
}
