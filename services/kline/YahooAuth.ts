/// <reference lib="deno.unstable" />

// ───────────────────────────────────────────────────────────────────────────
// Yahoo Finance cookie+crumb authentication (port of yfinance's session flow).
//
// Yahoo's free chart API blocks same-session intraday futures data for
// anonymous requests. The fix mirrors what Python's yfinance does:
//   1. GET https://fc.yahoo.com → Yahoo sets an A3 cookie.
//   2. GET https://query1.finance.yahoo.com/v1/test/getcrumb (with cookie)
//      → returns a crumb token.
//   3. GET https://query2.finance.yahoo.com/v8/finance/chart/{ticker}
//      ?...params...&crumb={crumb}  (with cookie)
//
// Works in pure Deno — no TLS fingerprinting needed. Cookie+crumb cached
// for 12 hours (Yahoo rotates them roughly daily).
// ───────────────────────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface AuthSession {
  cookie: string;
  crumb: string;
  expires: number; // unix ms
}

let cached: AuthSession | null = null;
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Acquire (or return cached) Yahoo cookie+crumb session. */
export async function getAuth(): Promise<AuthSession> {
  if (cached && Date.now() < cached.expires) return cached;

  // Step 1 — Get A3 cookie
  const res1 = await fetch("https://fc.yahoo.com", {
    redirect: "manual",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  // 404 is expected — we just need the Set-Cookie
  const setCookies = res1.headers.getSetCookie?.() ?? [];
  const parts = setCookies
    .map((c) => c.split(";")[0])
    .filter((p) => p.includes("="));
  if (parts.length === 0) throw new Error("YahooAuth: no cookies returned");
  const cookie = parts.join("; ");

  // Step 2 — Get crumb
  const res2 = await fetch(
    "https://query1.finance.yahoo.com/v1/test/getcrumb",
    { headers: { "User-Agent": UA, Cookie: cookie } },
  );
  if (!res2.ok) throw new Error(`YahooAuth: getcrumb failed (${res2.status})`);
  const crumb = await res2.text();
  if (!crumb || crumb.length < 2) throw new Error("YahooAuth: empty crumb");

  cached = { cookie, crumb, expires: Date.now() + TTL_MS };
  console.log("[YahooAuth] New session acquired, crumb:", crumb);
  return cached;
}

/** Build headers for an authenticated Yahoo request. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { cookie } = await getAuth();
  return { "User-Agent": UA, Cookie: cookie };
}

/**
 * Fetch a Yahoo chart URL with auth. Appends crumb automatically.
 * If the first attempt gets a 400/429, refreshes the session and retries once.
 */
export async function fetchChart(
  symbol: string,
  params: Record<string, string>,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { cookie, crumb } = await getAuth();
    const qs = new URLSearchParams({
      ...params,
      crumb,
    }).toString();
    const url =
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`;

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: cookie },
    });

    if (res.status === 429 || res.status === 400) {
      console.warn(`[YahooAuth] ${res.status} — refreshing session (attempt ${attempt + 1})`);
      cached = null; // force refresh
      continue;
    }
    return res;
  }
  // Final attempt without crumb as last resort
  const qs = new URLSearchParams(params).toString();
  return await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`,
    { headers: { "User-Agent": UA } },
  );
}
