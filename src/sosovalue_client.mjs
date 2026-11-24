/**
 * FlowRegime One — SoSoValue OpenAPI v1 Client & Live Public Fallback Provider
 *
 * Verified SoSoValue OpenAPI v1 endpoints (header auth: `x-soso-api-key`):
 *   - GET /openapi/v1/etfs/summary-history?symbol=BTC&country_code=US&limit=30
 *   - GET /openapi/v1/etfs/summary-history?symbol=ETH&country_code=US&limit=30
 *   - GET /openapi/v1/etfs?symbol=BTC&country_code=US
 *   - GET /openapi/v1/indices/ssimag7/market-snapshot
 *   - GET /openapi/v1/news?page=1&page_size=6
 *   - GET /openapi/v1/market/overview
 *
 * When `SOSOVALUE_API_KEY` is unset or rate-limited, seamlessly falls back to live
 * public market endpoints (Kraken / Coinbase Exchange OHLCV + DefiLlama Stablecoin
 * Liquidity Flows + Alternative.me Fear & Greed) with explicit data-source attribution.
 */

export const DEFAULT_SOSOVALUE_BASE_URL = "https://openapi.sosovalue.com/openapi/v1";

export const SOSOVALUE_ENDPOINTS = Object.freeze({
  btcEtfHistory: "/etfs/summary-history?symbol=BTC&country_code=US&limit=30",
  ethEtfHistory: "/etfs/summary-history?symbol=ETH&country_code=US&limit=30",
  btcEtfList: "/etfs?symbol=BTC&country_code=US",
  ssiMag7Snapshot: "/indices/ssimag7/market-snapshot",
  newsFeed: "/news?page=1&page_size=6",
  marketOverview: "/market/overview",
});

const USER_AGENT = "FlowRegimeOne/1.0 (+https://github.com/Upswing-Labs)";

/**
 * Deterministic offline snapshot used ONLY if all live upstream networks fail
 * (e.g. airgapped unit tests or transient edge outage). Always explicitly tagged.
 */
function buildDeterministicOfflineSnapshot() {
  const baseDate = Date.UTC(2026, 10, 23); // 2026-11-23
  const btcCloses = [
    68420, 68910, 69540, 70120, 69480, 68750, 67990, 68310, 67640, 66890,
    66150, 65420, 65890, 65110, 64380, 63920, 64510, 63740, 62850, 62120,
    61580, 62040, 61420, 60890, 60120, 59480, 58815, 60086, 61163, 61190,
    60464,
  ];
  const ethCloses = [
    2180, 2205, 2230, 2248, 2212, 2175, 2140, 2158, 2115, 2088,
    2050, 2015, 2032, 1995, 1962, 1940, 1965, 1928, 1890, 1855,
    1822, 1840, 1810, 1782, 1748, 1720, 1682, 1721, 1708, 1693,
    1695,
  ];
  const solCloses = [
    102.4, 104.1, 105.8, 106.5, 104.2, 101.9, 99.4, 100.8, 98.2, 96.5,
    94.1, 91.8, 93.0, 90.4, 88.2, 86.9, 88.5, 85.7, 83.2, 81.4,
    79.6, 80.9, 78.8, 76.5, 74.2, 72.1, 70.6, 71.9, 71.2, 71.4,
    71.2,
  ];
  const flowsUsd = [
    185e6, 240e6, 310e6, 145e6, -85e6, -120e6, -165e6, 60e6, -95e6, -210e6,
    -180e6, -245e6, 45e6, -135e6, -260e6, -190e6, 90e6, -175e6, -310e6, -280e6,
    -225e6, 55e6, -160e6, -240e6, -315e6, -290e6, -185e6, 115e6, 82e6, -64e6,
    -92e6,
  ];

  const days = btcCloses.map((_, idx) => {
    const d = new Date(baseDate - (btcCloses.length - 1 - idx) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  });

  return {
    days,
    btcCloses,
    ethCloses,
    solCloses,
    btcHighs: btcCloses.map((c) => Number((c * 1.022).toFixed(2))),
    btcLows: btcCloses.map((c) => Number((c * 0.978).toFixed(2))),
    btcVolumesUsd: btcCloses.map((c, i) => Number((c * (9200 + (i % 7) * 1400)).toFixed(0))),
    flowsUsd,
    ethFlowsUsd: flowsUsd.map((f) => Math.round(f * 0.24)),
    fearGreed: 14,
    fearGreedLabel: "Extreme Fear",
    btcNetAssetsUsd: 89_400_000_000,
    btcCumInflowUsd: 38_750_000_000,
    ethNetAssetsUsd: 8_630_000_000,
    ethCumInflowUsd: 11_290_000_000,
    ssiMag7: {
      ticker: "MAG7.ssi",
      price: 0.784,
      change_pct_24h: -0.0118,
      roi_7d: -0.042,
      roi_1m: -0.118,
    },
    news: [
      {
        title: "Offline fallback snapshot active — connect live network or set SOSOVALUE_API_KEY",
        category: "System",
        published_at: `${days[days.length - 1]}T00:00:00Z`,
        source: "FlowRegime One",
      },
    ],
  };
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  if (arr.length < 2) return 1e-6;
  const m = mean(arr);
  const v = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(Math.max(v, 1e-12));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 6500, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await resp.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      ok: resp.ok,
      status: resp.status,
      headers: resp.headers,
      json,
      raw: text.slice(0, 240),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse SoSoValue `/etfs/summary-history` response while respecting T+1 settlement rules.
 * Newest row may have `total_net_inflow: null` before US market T+1 settlement closes.
 */
export function parseSoSoEtfHistory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      series: [],
      latestSettled: null,
      intradaySettlementPending: false,
    };
  }
  // SoSoValue returns newest first; sort chronologically ascending for time-series math
  const normalized = rows
    .filter((r) => r && typeof r.date === "string")
    .map((r) => ({
      date: r.date,
      total_net_inflow:
        r.total_net_inflow === null || r.total_net_inflow === undefined
          ? null
          : Number(r.total_net_inflow),
      total_value_traded:
        r.total_value_traded === null || r.total_value_traded === undefined
          ? null
          : Number(r.total_value_traded),
      total_net_assets:
        r.total_net_assets === null || r.total_net_assets === undefined
          ? null
          : Number(r.total_net_assets),
      cum_net_inflow:
        r.cum_net_inflow === null || r.cum_net_inflow === undefined
          ? null
          : Number(r.cum_net_inflow),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const newest = normalized[normalized.length - 1];
  const intradaySettlementPending = newest ? newest.total_net_inflow === null : false;
  const settled = normalized.filter((r) => typeof r.total_net_inflow === "number" && Number.isFinite(r.total_net_inflow));
  const latestSettled = settled.length > 0 ? settled[settled.length - 1] : null;

  return {
    series: settled,
    latestSettled,
    intradaySettlementPending,
  };
}

/**
 * Compute 7d and 30d ETF / institutional flow momentum Z-scores + streak metrics.
 */
export function computeFlowMetrics(dailyNetFlowsUsd) {
  const clean = dailyNetFlowsUsd.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (clean.length === 0) {
    return {
      latest_daily_flow_usd: 0,
      sum_7d_usd: 0,
      sum_30d_usd: 0,
      mean_7d_usd: 0,
      mean_30d_usd: 0,
      std_30d_usd: 1e7,
      flow_zscore_7d: 0,
      flow_zscore_30d: 0,
      consecutive_inflow_days: 0,
      consecutive_outflow_days: 0,
    };
  }
  const win30 = clean.slice(-30);
  const win7 = clean.slice(-7);
  const mean30 = mean(win30);
  const std30 = Math.max(std(win30), 1e7);
  const mean7 = mean(win7);
  const flowZ7 = clamp((mean7 - mean30) / std30, -3.5, 3.5);
  const flowZ30 = clamp(mean30 / std30, -3.5, 3.5);

  let inflowStreak = 0;
  let outflowStreak = 0;
  for (let i = clean.length - 1; i >= 0; i--) {
    if (clean[i] > 0) {
      if (outflowStreak > 0) break;
      inflowStreak += 1;
    } else if (clean[i] < 0) {
      if (inflowStreak > 0) break;
      outflowStreak += 1;
    } else {
      break;
    }
  }

  return {
    latest_daily_flow_usd: Math.round(clean[clean.length - 1]),
    sum_7d_usd: Math.round(win7.reduce((a, b) => a + b, 0)),
    sum_30d_usd: Math.round(win30.reduce((a, b) => a + b, 0)),
    mean_7d_usd: Math.round(mean7),
    mean_30d_usd: Math.round(mean30),
    std_30d_usd: Math.round(std30),
    flow_zscore_7d: Number(flowZ7.toFixed(3)),
    flow_zscore_30d: Number(flowZ30.toFixed(3)),
    consecutive_inflow_days: inflowStreak,
    consecutive_outflow_days: outflowStreak,
  };
}

/**
 * Fetch live SoSoValue OpenAPI v1 dataset using `x-soso-api-key`.
 */
export async function fetchSoSoValueLive(apiKey, baseUrl = DEFAULT_SOSOVALUE_BASE_URL, fetchImpl = fetch) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const headers = { "x-soso-api-key": apiKey };

  const [btcRes, ethRes, ssiRes, newsRes, overviewRes] = await Promise.all([
    fetchJsonWithTimeout(`${cleanBase}${SOSOVALUE_ENDPOINTS.btcEtfHistory}`, { headers }, 6500, fetchImpl),
    fetchJsonWithTimeout(`${cleanBase}${SOSOVALUE_ENDPOINTS.ethEtfHistory}`, { headers }, 6500, fetchImpl),
    fetchJsonWithTimeout(`${cleanBase}${SOSOVALUE_ENDPOINTS.ssiMag7Snapshot}`, { headers }, 6500, fetchImpl),
    fetchJsonWithTimeout(`${cleanBase}${SOSOVALUE_ENDPOINTS.newsFeed}`, { headers }, 6500, fetchImpl),
    fetchJsonWithTimeout(`${cleanBase}${SOSOVALUE_ENDPOINTS.marketOverview}`, { headers }, 6500, fetchImpl),
  ]);

  const rateLimitRemaining =
    btcRes.headers?.get?.("X-RateLimit-Remaining-Minute") ??
    btcRes.headers?.get?.("x-ratelimit-remaining-minute") ??
    null;

  if (!btcRes.ok || !btcRes.json || btcRes.json.code !== 0 || !Array.isArray(btcRes.json.data)) {
    const errMsg = btcRes.json?.message || `HTTP ${btcRes.status}`;
    const errCode = btcRes.json?.code ?? btcRes.status;
    return {
      ok: false,
      error: `SoSoValue API rejected request (${errCode}: ${errMsg})`,
      status: btcRes.status,
      rateLimitRemaining,
    };
  }

  const btcEtf = parseSoSoEtfHistory(btcRes.json.data);
  const ethEtf =
    ethRes.ok && ethRes.json?.code === 0
      ? parseSoSoEtfHistory(ethRes.json.data)
      : { series: [], latestSettled: null, intradaySettlementPending: false };

  const ssiData = ssiRes.ok && ssiRes.json?.code === 0 ? ssiRes.json.data : null;
  const rawNews = newsRes.ok && newsRes.json?.code === 0 ? newsRes.json.data : null;
  const newsList = Array.isArray(rawNews?.list)
    ? rawNews.list
    : Array.isArray(rawNews)
      ? rawNews
      : [];
  const overview = overviewRes.ok && overviewRes.json?.code === 0 ? overviewRes.json.data : null;

  return {
    ok: true,
    rateLimitRemaining,
    btcEtf,
    ethEtf,
    ssiMag7: ssiData
      ? {
          ticker: "MAG7.ssi",
          price: Number(ssiData.price ?? 0),
          change_pct_24h: Number(ssiData.change_pct_24h ?? 0),
          roi_7d: ssiData.roi_7d !== undefined ? Number(ssiData.roi_7d) : null,
          roi_1m: ssiData.roi_1m !== undefined ? Number(ssiData.roi_1m) : null,
        }
      : null,
    news: newsList.slice(0, 6).map((item) => ({
      title: String(item.title || item.content || "SoSoValue Institutional Update").slice(0, 160),
      category: String(item.category_name || item.category || "SoSoValue Feed"),
      published_at: item.release_time
        ? new Date(Number(item.release_time)).toISOString()
        : item.published_at || new Date().toISOString(),
      source: String(item.source || "SoSoValue OpenAPI"),
    })),
    marketOverview: overview,
  };
}

async function fetchKrakenCandles(pair, fetchImpl = fetch) {
  const res = await fetchJsonWithTimeout(
    `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1440`,
    {},
    6500,
    fetchImpl
  );
  if (!res.ok || !res.json?.result) throw new Error(`Kraken ${pair} failed (${res.status})`);
  const key = Object.keys(res.json.result).find((k) => k !== "last");
  if (!key || !Array.isArray(res.json.result[key])) throw new Error(`Kraken ${pair} missing key`);
  return res.json.result[key].slice(-45).map((row) => ({
    date: new Date(Number(row[0]) * 1000).toISOString().slice(0, 10),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    vwap: Number(row[5]),
    volumeUsd: Number(row[6]) * Number(row[5]),
  }));
}

async function fetchCoinbaseCandles(productId, fetchImpl = fetch) {
  const res = await fetchJsonWithTimeout(
    `https://api.exchange.coinbase.com/products/${productId}/candles?granularity=86400`,
    {},
    6500,
    fetchImpl
  );
  if (!res.ok || !Array.isArray(res.json)) throw new Error(`Coinbase ${productId} failed (${res.status})`);
  return res.json
    .slice(0, 45)
    .reverse()
    .map((row) => ({
      date: new Date(Number(row[0]) * 1000).toISOString().slice(0, 10),
      low: Number(row[1]),
      high: Number(row[2]),
      open: Number(row[3]),
      close: Number(row[4]),
      vwap: (Number(row[2]) + Number(row[1]) + Number(row[4])) / 3,
      volumeUsd: Number(row[5]) * Number(row[4]),
    }));
}

async function fetchSpotSeries(fetchImpl = fetch) {
  try {
    const [btc, eth, sol] = await Promise.all([
      fetchKrakenCandles("XBTUSD", fetchImpl),
      fetchKrakenCandles("ETHUSD", fetchImpl),
      fetchKrakenCandles("SOLUSD", fetchImpl),
    ]);
    return { provider: "Kraken Spot Daily OHLCV", btc, eth, sol };
  } catch {
    const [btc, eth, sol] = await Promise.all([
      fetchCoinbaseCandles("BTC-USD", fetchImpl),
      fetchCoinbaseCandles("ETH-USD", fetchImpl),
      fetchCoinbaseCandles("SOL-USD", fetchImpl),
    ]);
    return { provider: "Coinbase Exchange Daily OHLCV", btc, eth, sol };
  }
}

async function fetchPublicMacroProxy(fetchImpl = fetch) {
  const [stablesRes, fngRes] = await Promise.allSettled([
    fetchJsonWithTimeout("https://stablecoins.llama.fi/stablecoincharts/all", {}, 6500, fetchImpl),
    fetchJsonWithTimeout("https://api.alternative.me/fng/?limit=14", {}, 6500, fetchImpl),
  ]);

  let stableMap = new Map();
  let latestStableUsd = null;
  if (stablesRes.status === "fulfilled" && stablesRes.value.ok && Array.isArray(stablesRes.value.json)) {
    const tail = stablesRes.value.json.slice(-50);
    for (const row of tail) {
      const ts = Number(row.date || 0);
      const val = Number(row.totalCirculatingUSD?.peggedUSD || 0);
      if (ts > 0 && val > 0) {
        stableMap.set(new Date(ts * 1000).toISOString().slice(0, 10), val);
        latestStableUsd = val;
      }
    }
  }

  let fearGreed = 50;
  let fearGreedLabel = "Neutral";
  if (fngRes.status === "fulfilled" && fngRes.value.ok && Array.isArray(fngRes.value.json?.data)) {
    const latest = fngRes.value.json.data[0];
    if (latest) {
      fearGreed = Number(latest.value ?? 50);
      fearGreedLabel = String(latest.value_classification || "Neutral");
    }
  }

  return { stableMap, latestStableUsd, fearGreed, fearGreedLabel };
}

/**
 * Unified Market & ETF Data Fetcher for FlowRegime One.
 * Prioritizes SoSoValue OpenAPI v1 whenever `env.SOSOVALUE_API_KEY` is configured,
 * and seamlessly falls back to live public market feeds with full transparency.
 */
export async function fetchMarketBundle(env = {}, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = typeof env.SOSOVALUE_API_KEY === "string" ? env.SOSOVALUE_API_KEY.trim() : "";
  const baseUrl = env.SOSOVALUE_BASE_URL || DEFAULT_SOSOVALUE_BASE_URL;
  const fetchedAt = new Date().toISOString();

  // Attempt SoSoValue OpenAPI v1 if key is provided, in parallel with spot candles & Fear/Greed
  const [sosoResult, spotResult, macroResult] = await Promise.allSettled([
    apiKey ? fetchSoSoValueLive(apiKey, baseUrl, fetchImpl) : Promise.resolve({ ok: false, unconfigured: true }),
    fetchSpotSeries(fetchImpl),
    fetchPublicMacroProxy(fetchImpl),
  ]);

  const soso = sosoResult.status === "fulfilled" ? sosoResult.value : { ok: false, error: sosoResult.reason?.message };
  const spotOk = spotResult.status === "fulfilled";
  const macro =
    macroResult.status === "fulfilled"
      ? macroResult.value
      : { stableMap: new Map(), latestStableUsd: null, fearGreed: 50, fearGreedLabel: "Neutral" };

  // If spot feeds failed completely AND SoSoValue isn't live, use deterministic offline snapshot
  if (!spotOk && !soso.ok) {
    const snap = buildDeterministicOfflineSnapshot();
    const btcFlowStats = computeFlowMetrics(snap.flowsUsd);
    const ethFlowStats = computeFlowMetrics(snap.ethFlowsUsd);
    return {
      fetched_at_utc: fetchedAt,
      data_source: "embedded_deterministic_snapshot",
      data_source_label: "OFFLINE SNAPSHOT FALLBACK (Upstream unreachable)",
      sosovalue_api_status: {
        configured: Boolean(apiKey),
        live_connected: false,
        base_url: baseUrl,
        auth_header: "x-soso-api-key",
        endpoints: SOSOVALUE_ENDPOINTS,
        rate_limit_remaining: null,
        note: apiKey
          ? soso.error || "SoSoValue API unavailable; fell back to deterministic snapshot."
          : "Set SOSOVALUE_API_KEY via `wrangler secret put SOSOVALUE_API_KEY` to stream live US Spot BTC/ETH ETF flows, MAG7.ssi, and SoSoValue News.",
      },
      spot: {
        provider: "Deterministic Snapshot",
        days: snap.days,
        btc_closes: snap.btcCloses,
        btc_highs: snap.btcHighs,
        btc_lows: snap.btcLows,
        btc_volumes_usd: snap.btcVolumesUsd,
        eth_closes: snap.ethCloses,
        sol_closes: snap.solCloses,
        latest_prices: {
          BTC: snap.btcCloses[snap.btcCloses.length - 1],
          ETH: snap.ethCloses[snap.ethCloses.length - 1],
          SOL: snap.solCloses[snap.solCloses.length - 1],
        },
      },
      etf_flows: {
        is_official_sosovalue_etf: false,
        proxy_methodology: "Embedded BTC/ETH flow calibration snapshot",
        intraday_settlement_pending: false,
        btc: {
          ...btcFlowStats,
          total_net_assets_usd: snap.btcNetAssetsUsd,
          cum_net_inflow_usd: snap.btcCumInflowUsd,
          history: snap.days.slice(-30).map((date, i) => ({
            date,
            net_inflow_usd: snap.flowsUsd[snap.flowsUsd.length - 30 + i] ?? 0,
          })),
        },
        eth: {
          ...ethFlowStats,
          total_net_assets_usd: snap.ethNetAssetsUsd,
          cum_net_inflow_usd: snap.ethCumInflowUsd,
          history: snap.days.slice(-30).map((date, i) => ({
            date,
            net_inflow_usd: snap.ethFlowsUsd[snap.ethFlowsUsd.length - 30 + i] ?? 0,
          })),
        },
      },
      ssi_index: snap.ssiMag7,
      sentiment: {
        fear_greed_index: snap.fearGreed,
        classification: snap.fearGreedLabel,
      },
      news: snap.news,
    };
  }

  // Build aligned spot arrays (use live Kraken/Coinbase if available, else offline baseline)
  const fallbackSnap = buildDeterministicOfflineSnapshot();
  const spotData = spotOk ? spotResult.value : null;
  const minLen = spotData
    ? Math.min(spotData.btc.length, spotData.eth.length, spotData.sol.length)
    : fallbackSnap.days.length;

  const btcBars = spotData ? spotData.btc.slice(-minLen) : null;
  const ethBars = spotData ? spotData.eth.slice(-minLen) : null;
  const solBars = spotData ? spotData.sol.slice(-minLen) : null;

  const days = btcBars ? btcBars.map((b) => b.date) : fallbackSnap.days;
  const btcCloses = btcBars ? btcBars.map((b) => b.close) : fallbackSnap.btcCloses;
  const btcHighs = btcBars ? btcBars.map((b) => b.high) : fallbackSnap.btcHighs;
  const btcLows = btcBars ? btcBars.map((b) => b.low) : fallbackSnap.btcLows;
  const btcVolumesUsd = btcBars ? btcBars.map((b) => b.volumeUsd) : fallbackSnap.btcVolumesUsd;
  const ethCloses = ethBars ? ethBars.map((b) => b.close) : fallbackSnap.ethCloses;
  const solCloses = solBars ? solBars.map((b) => b.close) : fallbackSnap.solCloses;

  const latestBtc = btcCloses[btcCloses.length - 1];
  const latestEth = ethCloses[ethCloses.length - 1];
  const latestSol = solCloses[solCloses.length - 1];

  // Build live public liquidity flow proxy (DefiLlama stablecoin daily net delta + signed spot flow impulse)
  const proxyFlowsBtc = [];
  const proxyFlowsEth = [];
  let prevStable = null;
  for (let i = 0; i < days.length; i++) {
    const st = macro.stableMap.get(days[i]) ?? prevStable;
    const stDelta = prevStable !== null && st !== null ? st - prevStable : 0;
    if (st !== null) prevStable = st;

    const retBtc = i > 0 ? Math.log(btcCloses[i] / btcCloses[i - 1]) : 0;
    const retEth = i > 0 ? Math.log(ethCloses[i] / ethCloses[i - 1]) : 0;
    const signedSpotBtc = Math.tanh(retBtc * 18) * btcVolumesUsd[i] * 0.12;
    const signedSpotEth = Math.tanh(retEth * 16) * (btcVolumesUsd[i] * 0.35) * 0.08;
    proxyFlowsBtc.push({
      date: days[i],
      net_inflow_usd: Math.round(stDelta * 0.65 + signedSpotBtc),
    });
    proxyFlowsEth.push({
      date: days[i],
      net_inflow_usd: Math.round(stDelta * 0.2 + signedSpotEth),
    });
  }

  // Synthesize MAG7.ssi proxy return from BTC/ETH/SOL if SoSoValue SSI isn't live
  const ssiRet1d =
    btcCloses.length >= 2
      ? 0.45 * (btcCloses.at(-1) / btcCloses.at(-2) - 1) +
        0.3 * (ethCloses.at(-1) / ethCloses.at(-2) - 1) +
        0.25 * (solCloses.at(-1) / solCloses.at(-2) - 1)
      : 0;
  const ssiRet7d =
    btcCloses.length >= 8
      ? 0.45 * (btcCloses.at(-1) / btcCloses.at(-8) - 1) +
        0.3 * (ethCloses.at(-1) / ethCloses.at(-8) - 1) +
        0.25 * (solCloses.at(-1) / solCloses.at(-8) - 1)
      : 0;
  const ssiRet30d =
    btcCloses.length >= 31
      ? 0.45 * (btcCloses.at(-1) / btcCloses.at(-31) - 1) +
        0.3 * (ethCloses.at(-1) / ethCloses.at(-31) - 1) +
        0.25 * (solCloses.at(-1) / solCloses.at(-31) - 1)
      : 0;

  if (soso.ok) {
    const btcSeries = soso.btcEtf.series.map((r) => ({
      date: r.date,
      net_inflow_usd: Math.round(r.total_net_inflow),
      total_value_traded_usd: r.total_value_traded ? Math.round(r.total_value_traded) : null,
      total_net_assets_usd: r.total_net_assets ? Math.round(r.total_net_assets) : null,
    }));
    const ethSeries = soso.ethEtf.series.map((r) => ({
      date: r.date,
      net_inflow_usd: Math.round(r.total_net_inflow),
      total_value_traded_usd: r.total_value_traded ? Math.round(r.total_value_traded) : null,
      total_net_assets_usd: r.total_net_assets ? Math.round(r.total_net_assets) : null,
    }));

    const btcFlowStats = computeFlowMetrics(btcSeries.map((x) => x.net_inflow_usd));
    const ethFlowStats = computeFlowMetrics(ethSeries.map((x) => x.net_inflow_usd));

    return {
      fetched_at_utc: fetchedAt,
      data_source: "sosovalue_openapi_v1",
      data_source_label: "SOSOVALUE OPENAPI v1 LIVE",
      sosovalue_api_status: {
        configured: true,
        live_connected: true,
        base_url: baseUrl,
        auth_header: "x-soso-api-key",
        endpoints: SOSOVALUE_ENDPOINTS,
        rate_limit_remaining: soso.rateLimitRemaining,
        note: soso.btcEtf.intradaySettlementPending
          ? "Connected to SoSoValue OpenAPI v1 (US Spot ETF flows settle T+1; latest intraday row pending settlement)."
          : "Connected live to SoSoValue OpenAPI v1 (US Spot BTC/ETH ETFs, MAG7.ssi, Institutional News).",
      },
      spot: {
        provider: spotData ? spotData.provider : "Deterministic Baseline",
        days,
        btc_closes: btcCloses,
        btc_highs: btcHighs,
        btc_lows: btcLows,
        btc_volumes_usd: btcVolumesUsd,
        eth_closes: ethCloses,
        sol_closes: solCloses,
        latest_prices: {
          BTC: Number(latestBtc.toFixed(2)),
          ETH: Number(latestEth.toFixed(2)),
          SOL: Number(latestSol.toFixed(2)),
        },
      },
      etf_flows: {
        is_official_sosovalue_etf: true,
        proxy_methodology: null,
        intraday_settlement_pending: soso.btcEtf.intradaySettlementPending,
        btc: {
          ...btcFlowStats,
          latest_date: soso.btcEtf.latestSettled?.date ?? null,
          total_net_assets_usd: soso.btcEtf.latestSettled?.total_net_assets ?? null,
          cum_net_inflow_usd: soso.btcEtf.latestSettled?.cum_net_inflow ?? null,
          history: btcSeries.slice(-30),
        },
        eth: {
          ...ethFlowStats,
          latest_date: soso.ethEtf.latestSettled?.date ?? null,
          total_net_assets_usd: soso.ethEtf.latestSettled?.total_net_assets ?? null,
          cum_net_inflow_usd: soso.ethEtf.latestSettled?.cum_net_inflow ?? null,
          history: ethSeries.slice(-30),
        },
      },
      ssi_index: soso.ssiMag7 || {
        ticker: "MAG7.ssi",
        price: null,
        change_pct_24h: Number(ssiRet1d.toFixed(4)),
        roi_7d: Number(ssiRet7d.toFixed(4)),
        roi_1m: Number(ssiRet30d.toFixed(4)),
        is_proxy: true,
      },
      sentiment: {
        fear_greed_index: macro.fearGreed,
        classification: macro.fearGreedLabel,
      },
      market_overview: soso.marketOverview,
      news: soso.news,
    };
  }

  // Live Public Market Proxy Fallback (real live prices + DefiLlama stablecoin liquidity + Fear & Greed)
  const btcProxySlice = proxyFlowsBtc.slice(-30);
  const ethProxySlice = proxyFlowsEth.slice(-30);
  const btcFlowStats = computeFlowMetrics(btcProxySlice.map((x) => x.net_inflow_usd));
  const ethFlowStats = computeFlowMetrics(ethProxySlice.map((x) => x.net_inflow_usd));

  const btcRet24 = btcCloses.length >= 2 ? ((latestBtc / btcCloses.at(-2) - 1) * 100).toFixed(2) : "0.00";
  const ethRet24 = ethCloses.length >= 2 ? ((latestEth / ethCloses.at(-2) - 1) * 100).toFixed(2) : "0.00";

  return {
    fetched_at_utc: fetchedAt,
    data_source: "public_market_proxy_fallback",
    data_source_label: "LIVE PUBLIC MARKET PROXY (Set SOSOVALUE_API_KEY for Official ETF Flows)",
    sosovalue_api_status: {
      configured: Boolean(apiKey),
      live_connected: false,
      base_url: baseUrl,
      auth_header: "x-soso-api-key",
      endpoints: SOSOVALUE_ENDPOINTS,
      rate_limit_remaining: soso.rateLimitRemaining ?? null,
      note: apiKey
        ? `${soso.error || "SoSoValue request failed"} — serving live Kraken/Coinbase + DefiLlama liquidity proxy.`
        : "SOSOVALUE_API_KEY not bound yet. Serving live Kraken/Coinbase OHLCV + DefiLlama Stablecoin Liquidity + Fear & Greed proxy. Bind key via `wrangler secret put SOSOVALUE_API_KEY` for live US Spot ETF inflows & SoSoValue News.",
    },
    spot: {
      provider: spotData.provider,
      days,
      btc_closes: btcCloses,
      btc_highs: btcHighs,
      btc_lows: btcLows,
      btc_volumes_usd: btcVolumesUsd,
      eth_closes: ethCloses,
      sol_closes: solCloses,
      latest_prices: {
        BTC: Number(latestBtc.toFixed(2)),
        ETH: Number(latestEth.toFixed(2)),
        SOL: Number(latestSol.toFixed(2)),
      },
    },
    etf_flows: {
      is_official_sosovalue_etf: false,
      proxy_methodology: "DefiLlama Global Stablecoin Daily Net Mint/Burn + Signed Spot Volume Impulse",
      intraday_settlement_pending: false,
      btc: {
        ...btcFlowStats,
        latest_date: btcProxySlice.at(-1)?.date ?? null,
        total_net_assets_usd: macro.latestStableUsd ? Math.round(macro.latestStableUsd) : null,
        cum_net_inflow_usd: null,
        history: btcProxySlice,
      },
      eth: {
        ...ethFlowStats,
        latest_date: ethProxySlice.at(-1)?.date ?? null,
        total_net_assets_usd: null,
        cum_net_inflow_usd: null,
        history: ethProxySlice,
      },
    },
    ssi_index: {
      ticker: "MAG7.ssi",
      price: Number((latestBtc * 0.0000125).toFixed(4)),
      change_pct_24h: Number(ssiRet1d.toFixed(4)),
      roi_7d: Number(ssiRet7d.toFixed(4)),
      roi_1m: Number(ssiRet30d.toFixed(4)),
      is_proxy: true,
    },
    sentiment: {
      fear_greed_index: macro.fearGreed,
      classification: macro.fearGreedLabel,
    },
    market_overview: null,
    news: [
      {
        title: `Live Spot Regime Feed: BTC $${latestBtc.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${btcRet24}% 24h) | ETH $${latestEth.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${ethRet24}% 24h)`,
        category: "Market Telemetry",
        published_at: fetchedAt,
        source: spotData.provider,
      },
      {
        title: `Crypto Fear & Greed Index at ${macro.fearGreed}/100 (${macro.fearGreedLabel}) — Liquidity 7d Z-Score ${btcFlowStats.flow_zscore_7d >= 0 ? "+" : ""}${btcFlowStats.flow_zscore_7d}σ`,
        category: "Macro Sentiment",
        published_at: fetchedAt,
        source: "Alternative.me + DefiLlama",
      },
      {
        title: "SoSoValue OpenAPI v1 Ready: Configure `SOSOVALUE_API_KEY` secret to unlock live US Spot BTC/ETH ETF inflows, IBIT/FBTC breakdowns & curated institutional news.",
        category: "SoSoValue Integration",
        published_at: fetchedAt,
        source: "openapi.sosovalue.com/openapi/v1",
      },
    ],
  };
}
