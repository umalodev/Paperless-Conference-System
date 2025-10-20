// src/features/menu/participants/utils/extractPeerMeta.js

/**
 * Deep scan object peer untuk mengekstrak displayName, participantId, dan userId
 * @param {object} obj - object peer dari mediasoup / socket metadata
 * @returns {{ displayName?: string, participantId?: string|number, userId?: string|number }}
 */
export function extractPeerMeta(obj) {
  if (!obj || typeof obj !== "object") return {};

  const seen = new Set();
  const stack = [obj];
  let displayName, participantId, userId;
  let hops = 0;

  const isIdLike = (x) =>
    ["string", "number"].includes(typeof x) && String(x).length > 0;

  while (stack.length && hops < 200) {
    const cur = stack.pop();
    hops++;
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);

    for (const [k, v] of Object.entries(cur)) {
      const key = String(k).toLowerCase();

      if (!displayName && key.includes("displayname") && typeof v === "string") {
        displayName = v.trim();
      }
      if (
        !participantId &&
        key.includes("participant") &&
        key.includes("id") &&
        isIdLike(v)
      ) {
        participantId = v;
      }
      if (
        !userId &&
        (key === "userid" || key.endsWith(".userid")) &&
        isIdLike(v)
      ) {
        userId = v;
      }

      if (v && typeof v === "object") stack.push(v);
    }
  }

  return { displayName, participantId, userId };
}
