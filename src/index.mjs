/**
 * FlowRegime One — Cloudflare Worker Entrypoint ($0-Infra Edge Quant Desk)
 *
 * Routes:
 *   GET  /                           -> Institutional Dark Quant Terminal UI
 *   GET  /health                     -> Health & SoSoValue integration status
 *   GET  /api/v1/regime              -> Live edge regime inference + allocation signal
 *   GET  /api/v1/etf-flows           -> SoSoValue ETF flow summary & 7d/30d Z-scores
 *   POST /api/v1/simulate-rebalance  -> Interactive fractional-Kelly & guardrail simulator
 *   GET  /api/v1/backtest            -> Verifiable purged walk-forward OOS metrics
 */

import { fetchMarketBundle } from "./sosovalue_client.mjs";
import {
  extractFeatureVector,
  runEdgeInference,
  computeAllocationAndGuardrails,
  getWalkforwardMetrics,
  getModelMetadata,
  REGIME_META,
} from "./regime_engine.mjs";
import { renderQuantTerminalHtml } from "./ui.mjs";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Lightweight in-isolate memory cache (avoids hammering upstream APIs on burst reloads)
let cachedBundle = null;
let cachedAtMs = 0;

export function clearMarketCache() {
  cachedBundle = null;
  cachedAtMs = 0;
}

async function getMarketBundleCached(env = {}, options = {}) {
  const ttlSec = Math.max(15, Number(env.CACHE_TTL_SECONDS || 120));
  const now = Date.now();
  const bypassCache = Boolean(options.bypassCache || options.fetchImpl);
  if (!bypassCache && cachedBundle && now - cachedAtMs < ttlSec * 1000) {
    return cachedBundle;
  }
  const bundle = await fetchMarketBundle(env, options);
  if (!bypassCache) {
    cachedBundle = bundle;
    cachedAtMs = now;
  }
  return bundle;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      ...SECURITY_HEADERS,
    },
  });
}

/**
 * Optional deterministic stress-test scenario override for interactive risk demos.
 * Strictly tagged `scenario_override: true` so live market signals are never conflated.
 */
function buildScenarioOverride(scenarioKey) {
  const presets = {
    bull_expansion: {
      regime: "ETF_MOMENTUM_EXPANSION",
      probs: [0.18, 0.72, 0.06, 0.04],
      expRet24h: 0.0145,
      expVolAnn: 0.34,
      features: { btc_ret_7d: 0.085, btc_ret_30d: 0.19, flow_zscore_7d: 1.85, drawdown_30d: -0.012 },
    },
    accumulation: {
      regime: "ACCUMULATION_BULL",
      probs: [0.68, 0.16, 0.11, 0.05],
      expRet24h: 0.0072,
      expVolAnn: 0.28,
      features: { btc_ret_7d: 0.025, btc_ret_30d: 0.065, flow_zscore_7d: 0.65, drawdown_30d: -0.028 },
    },
    high_vol_chop: {
      regime: "HIGH_VOL_CHOP",
      probs: [0.14, 0.11, 0.56, 0.19],
      expRet24h: 0.0005,
      expVolAnn: 0.68,
      features: { btc_ret_7d: -0.012, btc_ret_30d: 0.015, flow_zscore_7d: -0.15, drawdown_30d: -0.065 },
    },
    drawdown: {
      regime: "DISTRIBUTION_DRAWDOWN",
      probs: [0.05, 0.04, 0.19, 0.72],
      expRet24h: -0.016,
      expVolAnn: 0.74,
      features: { btc_ret_7d: -0.092, btc_ret_30d: -0.165, flow_zscore_7d: -1.65, drawdown_30d: -0.175 },
    },
  };
  const p = presets[scenarioKey];
  if (!p) return null;

  return {
    inference: {
      model_version: getModelMetadata().schema_version,
      architecture: "Scenario Stress-Test Override",
      regime: p.regime,
      regime_meta: REGIME_META[p.regime],
      confidence: Math.max(...p.probs),
      probabilities: {
        ACCUMULATION_BULL: p.probs[0],
        ETF_MOMENTUM_EXPANSION: p.probs[1],
        HIGH_VOL_CHOP: p.probs[2],
        DISTRIBUTION_DRAWDOWN: p.probs[3],
      },
      probabilities_array: p.probs,
      forecasts: {
        expected_return_24h: p.expRet24h,
        expected_return_24h_pct: Number((p.expRet24h * 100).toFixed(2)),
        expected_return_72h: Number((p.expRet24h * 2.15).toFixed(5)),
        expected_return_72h_pct: Number((p.expRet24h * 215).toFixed(2)),
        expected_vol_72h_annualized: p.expVolAnn,
        expected_vol_72h_pct: Number((p.expVolAnn * 100).toFixed(2)),
      },
      inference_latency_ms: 0.05,
    },
    features: { named: p.features },
  };
}

export async function handleRequest(request, env = {}, options = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...SECURITY_HEADERS } });
  }

  // GET / -> Institutional Dark Quant Terminal UI
  if (request.method === "GET" && path === "/") {
    return htmlResponse(renderQuantTerminalHtml(), 200);
  }

  // GET /health -> Fast health + model & SoSoValue binding diagnostics
  if (request.method === "GET" && path === "/health") {
    return jsonResponse({
      status: "ok",
      service: "upswing-flowregime",
      product: "FlowRegime One",
      organization: "Upswing-Labs",
      timestamp_utc: new Date().toISOString(),
      sosovalue_api_key_configured: Boolean(env.SOSOVALUE_API_KEY && String(env.SOSOVALUE_API_KEY).trim()),
      model: getModelMetadata(),
      routes: [
        "GET /",
        "GET /health",
        "GET /api/v1/regime",
        "GET /api/v1/etf-flows",
        "POST /api/v1/simulate-rebalance",
        "GET /api/v1/backtest",
      ],
    });
  }

  // GET /api/v1/backtest -> Verifiable Purged Walk-Forward Audit
  if (request.method === "GET" && path === "/api/v1/backtest") {
    return jsonResponse(getWalkforwardMetrics(), 200, { "Cache-Control": "public, max-age=300" });
  }

  // GET /api/v1/etf-flows -> Live SoSoValue ETF Flows + 7d/30d Momentum Z-Scores
  if (request.method === "GET" && path === "/api/v1/etf-flows") {
    const bundle = await getMarketBundleCached(env, options);
    return jsonResponse(
      {
        fetched_at_utc: bundle.fetched_at_utc,
        data_source: bundle.data_source,
        data_source_label: bundle.data_source_label,
        sosovalue_api_status: bundle.sosovalue_api_status,
        etf_flows: bundle.etf_flows,
        ssi_index: bundle.ssi_index,
        sentiment: bundle.sentiment,
      },
      200,
      { "Cache-Control": "public, max-age=60" }
    );
  }

  // GET /api/v1/regime -> Live Edge Regime Inference + Default Allocation Signal
  if (request.method === "GET" && path === "/api/v1/regime") {
    const bundle = await getMarketBundleCached(env, options);
    const features = extractFeatureVector(bundle);
    const inference = runEdgeInference(features);

    const capitalUsd = Number(url.searchParams.get("capital_usd") || 50000);
    const targetVolPct = Number(url.searchParams.get("target_vol_pct") || 28);
    const currentDdPct = Number(url.searchParams.get("current_drawdown_pct") || 0);
    const maxDdStopPct = Number(url.searchParams.get("max_drawdown_stop_pct") || 8);

    const prices = {
      ...bundle.spot.latest_prices,
      "MAG7.ssi": bundle.ssi_index?.price || 0.78,
    };
    const allocation = computeAllocationAndGuardrails(
      inference,
      features,
      {
        capital_usd: capitalUsd,
        target_vol_pct: targetVolPct,
        current_drawdown_pct: currentDdPct,
        max_drawdown_stop_pct: maxDdStopPct,
      },
      prices
    );

    return jsonResponse(
      {
        fetched_at_utc: bundle.fetched_at_utc,
        data_source: bundle.data_source,
        data_source_label: bundle.data_source_label,
        sosovalue_api_status: bundle.sosovalue_api_status,
        market: {
          spot_provider: bundle.spot.provider,
          latest_prices: bundle.spot.latest_prices,
          ssi_index: bundle.ssi_index,
          sentiment: bundle.sentiment,
        },
        etf_flows: bundle.etf_flows,
        features: features.named,
        inference,
        allocation,
        news: bundle.news,
      },
      200,
      { "Cache-Control": "public, max-age=45" }
    );
  }

  // POST /api/v1/simulate-rebalance -> Interactive Fractional-Kelly & Guardrail Simulator
  if (request.method === "POST" && path === "/api/v1/simulate-rebalance") {
    let body = {};
    try {
      const text = await request.text();
      if (text.trim()) body = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const bundle = await getMarketBundleCached(env, options);
    const liveFeatures = extractFeatureVector(bundle);
    const liveInference = runEdgeInference(liveFeatures);

    const scenarioKey = typeof body.scenario === "string" ? body.scenario.trim() : "live";
    const override = scenarioKey !== "live" ? buildScenarioOverride(scenarioKey) : null;

    const activeInference = override ? override.inference : liveInference;
    const activeFeatures = override ? override.features : liveFeatures;

    const prices = {
      ...bundle.spot.latest_prices,
      "MAG7.ssi": bundle.ssi_index?.price || 0.78,
    };

    const allocation = computeAllocationAndGuardrails(
      activeInference,
      activeFeatures,
      {
        capital_usd: body.capital_usd,
        target_vol_pct: body.target_vol_pct,
        current_drawdown_pct: body.current_drawdown_pct,
        max_drawdown_stop_pct: body.max_drawdown_stop_pct,
        kelly_cap: body.kelly_cap,
        current_holdings_usd: body.current_holdings_usd,
      },
      prices
    );

    return jsonResponse({
      simulated_at_utc: new Date().toISOString(),
      scenario: override ? scenarioKey : "live",
      scenario_override: Boolean(override),
      data_source: bundle.data_source,
      regime: activeInference.regime,
      confidence: activeInference.confidence,
      forecasts: activeInference.forecasts,
      allocation,
    });
  }

  return jsonResponse(
    {
      error: "Not Found",
      path,
      available_routes: [
        "GET /",
        "GET /health",
        "GET /api/v1/regime",
        "GET /api/v1/etf-flows",
        "POST /api/v1/simulate-rebalance",
        "GET /api/v1/backtest",
      ],
    },
    404
  );
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, { ctx });
    } catch (err) {
      return jsonResponse(
        {
          error: "Internal Worker Error",
          detail: err instanceof Error ? err.message : String(err),
        },
        500
      );
    }
  },
};
