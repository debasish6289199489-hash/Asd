// Server-only wrapper around the upstream level-up service.
// Never import this from client code: base URL + key must stay hidden.
const BASE = process.env["LEVELUP_API_BASE"] ?? "https://jexarcodexlevelup.vercel.app";
const KEY = process.env["LEVELUP_API_KEY"] ?? "JEXARCODEX";

export type BotInfo = {
  code: string;
  uid: string;
  player: string;
  region: string;
  level: number;
  exp: number;
  matches: number;
  status: string;
};

type Json = Record<string, unknown>;

async function call(path: string, params: Record<string, string>): Promise<Json> {
  const qs = new URLSearchParams({ ...params, key: KEY }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(55_000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as Json;
  } catch {
    return { success: false, error: "Service busy, thodi der baad try karo" };
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pulls a bot-info shape out of any of the upstream response layouts. */
function pick(raw: Json): Json {
  for (const k of ["info", "data", "result", "account", "id"]) {
    const v = raw[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Json;
  }
  return raw;
}

export function toBot(raw: Json): BotInfo {
  const o = pick(raw);
  return {
    code: String(o["code"] ?? raw["code"] ?? ""),
    uid: String(o["uid"] ?? o["UID"] ?? ""),
    player: String(o["name"] ?? o["nickname"] ?? o["player"] ?? ""),
    region: String(o["region"] ?? ""),
    level: num(o["current_level"] ?? o["level"]),
    exp: num(o["current_exp"] ?? o["exp"]),
    matches: num(o["total_match_played"] ?? o["matches"]),
    status: String(o["status"] ?? "IDLE").toUpperCase(),
  };
}

export function errorOf(raw: Json): string | null {
  if (raw["success"] === false || raw["error"]) {
    return String(raw["error"] ?? raw["message"] ?? "Request failed");
  }
  return null;
}

export const ff = {
  startWithPassword: (uid: string, password: string) =>
    call("/start_level_up", { UID: uid, PASSWORD: password }),
  startWithToken: (token: string) => call("/start_level_up", { access_token: token }),
  status: (code: string) => call("/check_status", { code }),
  start: (code: string) => call("/start", { code }),
  stop: (code: string) => call("/stop", { code }),
  remove: (code: string) => call("/delete", { code }),
};
