const COOKIE_NAME = "sessionId";

export function parseSessionId(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${COOKIE_NAME}=`)) {
      return trimmed.slice(COOKIE_NAME.length + 1) || undefined;
    }
  }
  return undefined;
}

export function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; SameSite=Lax`;
}

let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    const kvPath = Deno.env.get("DENO_KV_PATH");
    if (kvPath) {
      const dir = kvPath.lastIndexOf("/");
      if (dir > 0) await Deno.mkdir(kvPath.slice(0, dir), { recursive: true });
    }
    kvInstance = await Deno.openKv(kvPath);
  }
  return kvInstance;
}

function wordSelectionKey(sessionId: string): Deno.KvKey {
  return ["session", sessionId, "stage1_selections"];
}

export async function saveWordSelection(
  kv: Deno.Kv,
  sessionId: string,
  wordIds: number[],
): Promise<void> {
  await kv.set(wordSelectionKey(sessionId), wordIds);
}

export async function loadWordSelection(
  kv: Deno.Kv,
  sessionId: string,
): Promise<number[]> {
  const result = await kv.get<number[]>(wordSelectionKey(sessionId));
  return result.value ?? [];
}

export interface Stage2Result {
  score: number;
  truthfulness: number;
}

function stage2ResultKey(sessionId: string): Deno.KvKey {
  return ["session", sessionId, "stage2_result"];
}

export async function saveStage2Result(
  kv: Deno.Kv,
  sessionId: string,
  result: Stage2Result,
): Promise<void> {
  await kv.set(stage2ResultKey(sessionId), result);
}

export async function loadStage2Result(
  kv: Deno.Kv,
  sessionId: string,
): Promise<Stage2Result | null> {
  const entry = await kv.get<Stage2Result>(stage2ResultKey(sessionId));
  return entry.value;
}
