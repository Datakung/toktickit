interface Attempt { times: number[] }
const attempts = new Map<string, Attempt>();
const WINDOW = 15 * 60 * 1000;
function entry(key: string, now: number) {
  const times = (attempts.get(key)?.times ?? []).filter(time => now - time < WINDOW);
  if (times.length) attempts.set(key, { times }); else attempts.delete(key);
  return times;
}
export function loginBlocked(email: string, ip: string, now = Date.now()) {
  return entry(`email:${email}`, now).length >= 5 || entry(`ip:${ip}`, now).length >= 30;
}
export function recordLoginFailure(email: string, ip: string, now = Date.now()) {
  for (const key of [`email:${email}`, `ip:${ip}`]) attempts.set(key, { times: [...entry(key, now), now] });
  if (attempts.size > 5000) for (const key of attempts.keys()) { entry(key, now); if (attempts.size <= 4000) break; }
}
export function clearLoginFailures(email: string) { attempts.delete(`email:${email}`); }
export function resetLoginThrottleForTests() { attempts.clear(); }
