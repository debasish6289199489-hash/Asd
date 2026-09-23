import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";

import { ff, toBot, errorOf } from "./ff.server";

const COOKIE = "bg_session";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function db(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const hash = (username: string, password: string) => sha(`${username.toUpperCase()}:${password}`);

export type SessionUser = {
  id: string;
  username: string;
  slots: number;
  expires_at: string;
  is_active: boolean;
  is_owner: boolean;
};

async function currentUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const supabase = await db();
  const { data } = await supabase
    .from("sessions")
    .select("expires_at, app_users(id, username, slots, expires_at, is_active, is_owner)")
    .eq("token", token)
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = data.app_users as unknown as SessionUser | null;
  if (!u || !u.is_active) return null;
  return u;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Login karo pehle");
  return user;
}

async function requireOwner() {
  const user = await requireUser();
  if (!user.is_owner) throw new Error("Sirf owner ke liye hai");
  return user;
}

/** Expired accounts ke saare running level ups band + delete kar deta hai. */
async function sweepExpired() {
  const supabase = await db();
  const { data: expired } = await supabase
    .from("app_users")
    .select("id")
    .lt("expires_at", new Date().toISOString())
    .eq("is_owner", false);
  if (!expired?.length) return;
  const ids = expired.map((u) => u.id);
  const { data: bots } = await supabase.from("bots").select("id, code").in("user_id", ids);
  if (!bots?.length) return;
  await Promise.all(
    bots.map(async (b) => {
      try {
        await ff.stop(b.code);
        await ff.remove(b.code);
      } catch {
        /* upstream down: row still removed below */
      }
    }),
  );
  await supabase
    .from("bots")
    .delete()
    .in(
      "id",
      bots.map((b) => b.id),
    );
}

/* ---------------------------------- public --------------------------------- */

export const getSite = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const [{ data: settings }, { data: plans }, { data: broadcasts }] = await Promise.all([
    supabase.from("settings").select("key, value"),
    supabase.from("plans").select("*").order("sort_order"),
    supabase
      .from("broadcasts")
      .select("id, message, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const map: Record<string, string> = {};
  for (const s of settings ?? []) map[s.key] = s.value;
  return { settings: map, plans: plans ?? [], broadcasts: broadcasts ?? [] };
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await db();
    const username = data.username.trim();
    const { data: user } = await supabase
      .from("app_users")
      .select("*")
      .ilike("username", username)
      .maybeSingle();
    if (!user || user.password_hash !== (await hash(user?.username ?? username, data.password))) {
      return { ok: false as const, error: "Username ya password galat hai" };
    }
    if (!user.is_active) return { ok: false as const, error: "Account disabled hai, owner se baat karo" };
    if (new Date(user.expires_at).getTime() < Date.now() && !user.is_owner) {
      return { ok: false as const, error: "Plan expire ho gaya hai" };
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    await supabase.from("sessions").insert({ token, user_id: user.id });
    setCookie(COOKIE, token, {
      httpOnly: true,
      secure: getRequest().url.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true as const, isOwner: user.is_owner };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(COOKIE);
  if (token) {
    const supabase = await db();
    await supabase.from("sessions").delete().eq("token", token);
  }
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
});

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const user = await currentUser();
  return { user };
});

/* --------------------------------- member --------------------------------- */

export const myBots = createServerFn({ method: "POST" })
  .inputValidator((d: { refresh?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const user = await requireUser();
    await sweepExpired();
    const supabase = await db();
    const { data: bots } = await supabase
      .from("bots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");
    if (data.refresh && bots?.length) {
      await Promise.all(
        bots.map(async (b) => {
          try {
            const raw = await ff.status(b.code);
            if (errorOf(raw)) return;
            const info = toBot(raw);
            await supabase
              .from("bots")
              .update({
                level: info.level || b.level,
                exp: info.exp || b.exp,
                matches: info.matches,
                status: info.status,
                player: info.player || b.player,
                uid: info.uid || b.uid,
              })
              .eq("id", b.id);
          } catch {
            /* keep last known values */
          }
        }),
      );
      const { data: fresh } = await supabase
        .from("bots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      return { bots: fresh ?? [], slots: user.slots };
    }
    return { bots: bots ?? [], slots: user.slots };
  });

export const startLevelUp = createServerFn({ method: "POST" })
  .inputValidator((d: { uid?: string; password?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (new Date(user.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "Plan expire ho gaya hai" };
    }
    const supabase = await db();
    const { count } = await supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= user.slots) {
      return { ok: false as const, error: `Slot full hai (${user.slots}). Extra slot owner se lo.` };
    }
    const raw = data.token
      ? await ff.startWithToken(data.token.trim())
      : await ff.startWithPassword((data.uid ?? "").trim(), (data.password ?? "").trim());
    const err = errorOf(raw);
    if (err) return { ok: false as const, error: err };
    const info = toBot(raw);
    if (!info.code) return { ok: false as const, error: "Login fail hua, details check karo" };

    const { data: existing } = await supabase
      .from("bots")
      .select("id, user_id")
      .eq("code", info.code)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== user.id) {
        return { ok: false as const, error: "Ye ID already kisi aur account pe chal rahi hai" };
      }
      return { ok: true as const };
    }
    await supabase.from("bots").insert({
      user_id: user.id,
      code: info.code,
      uid: info.uid,
      player: info.player,
      region: info.region,
      level: info.level,
      exp: info.exp,
      matches: info.matches,
      status: info.status === "IDLE" ? "RUNNING" : info.status,
      start_level: info.level,
      start_exp: info.exp,
    });
    return { ok: true as const };
  });

export const botAction = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; action: "start" | "stop" | "delete" | "refresh" }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    const { data: bot } = await supabase
      .from("bots")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (!bot || (bot.user_id !== user.id && !user.is_owner)) {
      return { ok: false as const, error: "Bot nahi mila" };
    }
    if (data.action === "delete") {
      await ff.remove(bot.code).catch(() => null);
      await supabase.from("bots").delete().eq("id", bot.id);
      return { ok: true as const };
    }
    const raw =
      data.action === "start"
        ? await ff.start(bot.code)
        : data.action === "stop"
          ? await ff.stop(bot.code)
          : await ff.status(bot.code);
    const err = errorOf(raw);
    if (err) return { ok: false as const, error: err };
    const info = toBot(raw);
    await supabase
      .from("bots")
      .update({
        status:
          data.action === "start" ? "RUNNING" : data.action === "stop" ? "STOPPED" : info.status,
        level: info.level || bot.level,
        exp: info.exp || bot.exp,
        matches: info.matches || bot.matches,
      })
      .eq("id", bot.id);
    return { ok: true as const };
  });

/* ---------------------------------- owner --------------------------------- */

export const ownerData = createServerFn({ method: "POST" }).handler(async () => {
  await requireOwner();
  await sweepExpired();
  const supabase = await db();
  const [{ data: users }, { data: bots }, { data: plans }, { data: settings }, { data: bc }] =
    await Promise.all([
      supabase.from("app_users").select("*").order("created_at"),
      supabase.from("bots").select("*").order("created_at"),
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("settings").select("key, value"),
      supabase.from("broadcasts").select("*").order("created_at", { ascending: false }),
    ]);
  const map: Record<string, string> = {};
  for (const s of settings ?? []) map[s.key] = s.value;
  const names = new Map((users ?? []).map((u) => [u.id, u.username]));
  return {
    users: users ?? [],
    bots: (bots ?? []).map((b) => ({ ...b, owner: names.get(b.user_id) ?? "-" })),
    plans: plans ?? [],
    settings: map,
    broadcasts: bc ?? [],
  };
});

export const ownerUser = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      action: "create" | "extend" | "toggle" | "password" | "slots" | "delete";
      id?: string;
      username?: string;
      password?: string;
      slots?: number;
      days?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const supabase = await db();

    if (data.action === "create") {
      const username = (data.username ?? "").trim();
      if (!username || !data.password) return { ok: false as const, error: "Username/password do" };
      const { error } = await supabase.from("app_users").insert({
        username,
        password_hash: await hash(username, data.password),
        slots: Math.max(1, data.slots ?? 1),
        expires_at: new Date(Date.now() + (data.days ?? 1) * 86400000).toISOString(),
      });
      if (error) return { ok: false as const, error: "Ye username already hai" };
      return { ok: true as const };
    }

    if (!data.id) return { ok: false as const, error: "User missing" };
    const { data: u } = await supabase.from("app_users").select("*").eq("id", data.id).maybeSingle();
    if (!u) return { ok: false as const, error: "User nahi mila" };

    if (data.action === "delete") {
      const { data: bots } = await supabase.from("bots").select("code").eq("user_id", u.id);
      await Promise.all((bots ?? []).map((b) => ff.remove(b.code).catch(() => null)));
      await supabase.from("app_users").delete().eq("id", u.id);
      return { ok: true as const };
    }
    if (data.action === "extend") {
      const base = Math.max(Date.now(), new Date(u.expires_at).getTime());
      await supabase
        .from("app_users")
        .update({ expires_at: new Date(base + (data.days ?? 1) * 86400000).toISOString() })
        .eq("id", u.id);
      return { ok: true as const };
    }
    if (data.action === "toggle") {
      await supabase.from("app_users").update({ is_active: !u.is_active }).eq("id", u.id);
      return { ok: true as const };
    }
    if (data.action === "slots") {
      await supabase
        .from("app_users")
        .update({ slots: Math.max(1, data.slots ?? 1) })
        .eq("id", u.id);
      return { ok: true as const };
    }
    if (!data.password) return { ok: false as const, error: "Naya password do" };
    await supabase
      .from("app_users")
      .update({ password_hash: await hash(u.username, data.password) })
      .eq("id", u.id);
    await supabase.from("sessions").delete().eq("user_id", u.id);
    return { ok: true as const };
  });

export const ownerPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      action: "save" | "delete";
      id?: string;
      name?: string;
      price?: number;
      days?: number;
      slots?: number;
      extra_slot_price?: number;
      sort_order?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const supabase = await db();
    if (data.action === "delete") {
      if (data.id) await supabase.from("plans").delete().eq("id", data.id);
      return { ok: true as const };
    }
    const row = {
      name: data.name ?? "PLAN",
      price: data.price ?? 0,
      days: data.days ?? 1,
      slots: data.slots ?? 1,
      extra_slot_price: data.extra_slot_price ?? 50,
      sort_order: data.sort_order ?? 0,
    };
    if (data.id) await supabase.from("plans").update(row).eq("id", data.id);
    else await supabase.from("plans").insert(row);
    return { ok: true as const };
  });

export const ownerSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { values: Record<string, string> }) => d)
  .handler(async ({ data }) => {
    await requireOwner();
    const supabase = await db();
    const rows = Object.entries(data.values).map(([key, value]) => ({ key, value }));
    if (rows.length) await supabase.from("settings").upsert(rows);
    return { ok: true as const };
  });

export const ownerBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: { action: "add" | "toggle" | "delete"; id?: string; message?: string }) => d)
  .handler(async ({ data }) => {
    await requireOwner();
    const supabase = await db();
    if (data.action === "add") {
      if (!data.message?.trim()) return { ok: false as const, error: "Message likho" };
      await supabase.from("broadcasts").insert({ message: data.message.trim() });
      return { ok: true as const };
    }
    if (!data.id) return { ok: false as const, error: "Missing" };
    if (data.action === "delete") {
      await supabase.from("broadcasts").delete().eq("id", data.id);
      return { ok: true as const };
    }
    const { data: b } = await supabase
      .from("broadcasts")
      .select("is_active")
      .eq("id", data.id)
      .maybeSingle();
    await supabase
      .from("broadcasts")
      .update({ is_active: !(b?.is_active ?? true) })
      .eq("id", data.id);
    return { ok: true as const };
  });

/** Logo / hero / music file upload -> public media bucket. */
export const ownerUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; type: string; base64: string; settingKey: string }) => d)
  .handler(async ({ data }) => {
    await requireOwner();
    const supabase = await db();
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const path = `${Date.now()}-${data.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, bytes, { contentType: data.type || "application/octet-stream", upsert: true });
    if (error) return { ok: false as const, error: error.message };
    const url = `/api/public/media/${path}`;
    await supabase.from("settings").upsert({ key: data.settingKey, value: url });
    return { ok: true as const, url };
  });
