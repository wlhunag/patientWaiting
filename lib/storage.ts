import { Redis } from "@upstash/redis";
import { todayInTaipei } from "./time";
import type { AppointmentState } from "./types";

// 每天一個 hash：dental:state:2026-05-18
// hash 內 field = appointmentId, value = JSON(AppointmentState)
const keyForDay = (date: string) => `dental:state:${date}`;
const DAY_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 天後自動清掉

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  // 同時接受 Upstash 原生 (UPSTASH_REDIS_REST_*) 和 Vercel KV (KV_REST_API_*) 兩種命名
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN) env vars",
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

export async function getAllStates(
  now: Date = new Date(),
): Promise<Record<string, AppointmentState>> {
  const key = keyForDay(todayInTaipei(now));
  const raw = await getRedis().hgetall<Record<string, AppointmentState>>(key);
  // Upstash 會自動把 JSON value 反序列化，但保險起見處理一下
  if (!raw) return {};
  const result: Record<string, AppointmentState> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      try {
        result[k] = JSON.parse(v);
      } catch {
        // skip
      }
    } else {
      result[k] = v as AppointmentState;
    }
  }
  return result;
}

export async function setState(
  appointmentId: string,
  state: AppointmentState,
  now: Date = new Date(),
): Promise<void> {
  const key = keyForDay(todayInTaipei(now));
  const redis = getRedis();
  await redis.hset(key, { [appointmentId]: JSON.stringify(state) });
  await redis.expire(key, DAY_TTL_SECONDS);
}

export async function clearState(
  appointmentId: string,
  now: Date = new Date(),
): Promise<void> {
  const key = keyForDay(todayInTaipei(now));
  await getRedis().hdel(key, appointmentId);
}

export async function resetDay(now: Date = new Date()): Promise<void> {
  const key = keyForDay(todayInTaipei(now));
  await getRedis().del(key);
}
