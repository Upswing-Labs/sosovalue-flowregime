import test from "node:test";
import assert from "node:assert/strict";

import {
  parseSoSoEtfHistory,
  computeFlowMetrics,
  fetchMarketBundle,
} from "../src/sosovalue_client.mjs";
import {
  REGIME_LABELS,
  extractFeatureVector,
  runEdgeInference,
  computeAllocationAndGuardrails,
  getWalkforwardMetrics,
  getModelMetadata,
} from "../src/regime_engine.mjs";
import { handleRequest, clearMarketCache } from "../src/index.mjs";

function makeJsonResponse(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function buildMockKrakenRows(startPrice, drift = 0.002, days = 45) {
  const baseTs = Math.floor(Date.UTC(2026, 9, 10) / 1000);
  const rows = [];
  let px = startPrice;
  for (let i = 0; i < days; i++) {
    px = px * (1 + drift + ((i % 5) - 2) * 0.004);
    const high = px * 1.018;
    const low = px * 0.982;
    rows.push([
      baseTs + i * 86400,
      String(px.toFixed(2)),
      String(high.toFixed(2)),
      String(low.toFixed(2)),
      String(px.toFixed(2)),
      String(px.toFixed(2)),
      "12500.5",
      45000,
    ]);
  }
  return rows;
}

function createMockFetch({ enableSoSo = false, failAll = false } = {}) {
  const recordedRequests = [];

  const mockFetch = async (url, init = {}) => {
    const u = String(url);
    recordedRequests.push({ url: u, headers: init.headers || {} });

    if (failAll) {
      throw new Error("Simulated network outage");
    }

    if (u.startsWith("https://openapi.sosovalue.com/openapi/v1")) {
      const key = init.headers?.["x-soso-api-key"];
      if (!enableSoSo || !key) {
        return makeJsonResponse({ code: 400101, message: "API Key is invalid or does not exist" }, 401);
      }
      if (u.includes("/etfs/summary-history") && u.includes("symbol=BTC")) {
        const rows = [];
        // Newest row simulates T+1 pending settlement (`total_net_inflow: null`)
        rows.push({
          date: "2026-11-24",
          total_net_inflow: null,
          total_value_traded: 3920000000,
          total_net_assets: 94200000000,
          cum_net_inflow: 41250000000,
        });
        for (let i = 1; i <= 30; i++) {
          const d = new Date(Date.UTC(2026, 10, 24 - i)).toISOString().slice(0, 10);
          rows.push({
            date: d,
            total_net_inflow: i <= 5 ? 245000000 + i * 15000000 : (i % 3 === 0 ? -75000000 : 120000000),
            total_value_traded: 3400000000,
            total_net_assets: 94000000000 - i * 100000000,
            cum_net_inflow: 41250000000 - i * 80000000,
          });
        }
        return makeJsonResponse(
          { code: 0, message: "success", data: rows },
          200,
          { "X-RateLimit-Remaining-Minute": "94" }
        );
      }
      if (u.includes("/etfs/summary-history") && u.includes("symbol=ETH")) {
        const rows = [];
        for (let i = 1; i <= 30; i++) {
          const d = new Date(Date.UTC(2026, 10, 24 - i)).toISOString().slice(0, 10);
          rows.push({
            date: d,
            total_net_inflow: i <= 4 ? 62000000 : -18000000,
            total_value_traded: 780000000,
            total_net_assets: 9100000000,
            cum_net_inflow: 11800000000,
          });
        }
        return makeJsonResponse({ code: 0, message: "success", data: rows });
      }
      if (u.includes("/indices/ssimag7/market-snapshot")) {
        return makeJsonResponse({
          code: 0,
          message: "success",
          data: { price: 0.9125, change_pct_24h: 0.0245, roi_7d: 0.081, roi_1m: 0.142 },
        });
      }
      if (u.includes("/news")) {
        return makeJsonResponse({
          code: 0,
          message: "success",
          data: {
            page: 1,
            page_size: 6,
            total: 2,
            list: [
              {
                title: "US Spot Bitcoin ETFs record 5th consecutive day of net inflows led by IBIT",
                category_name: "Institution",
                release_time: Date.UTC(2026, 10, 23, 18, 0, 0),
                source: "SoSoValue Research",
              },
            ],
          },
        });
      }
      if (u.includes("/market/overview")) {
        return makeJsonResponse({
          code: 0,
          message: "success",
          data: { total_market_cap: 2650000000000, change_pct_24h: 0.021 },
        });
      }
    }

    if (u.includes("api.kraken.com")) {
      if (u.includes("XBTUSD")) {
        return makeJsonResponse({ error: [], result: { XXBTZUSD: buildMockKrakenRows(64000, 0.004) } });
      }
      if (u.includes("ETHUSD")) {
        return makeJsonResponse({ error: [], result: { XETHZUSD: buildMockKrakenRows(2250, 0.005) } });
      }
      if (u.includes("SOLUSD")) {
        return makeJsonResponse({ error: [], result: { SOLUSD: buildMockKrakenRows(112, 0.006) } });
      }
    }

    if (u.includes("stablecoins.llama.fi")) {
      const baseTs = Math.floor(Date.UTC(2026, 9, 10) / 1000);
      const arr = [];
      for (let i = 0; i < 45; i++) {
        arr.push({
          date: String(baseTs + i * 86400),
          totalCirculatingUSD: { peggedUSD: 230_000_000_000 + i * 120_000_000 },
        });
      }
      return makeJsonResponse(arr);
    }

    if (u.includes("api.alternative.me")) {
      return makeJsonResponse({
        name: "Fear and Greed Index",
        data: [{ value: "66", value_classification: "Greed", timestamp: "1795478400" }],
      });
    }

    return makeJsonResponse({ error: "Unhandled mock URL: " + u }, 404);
  };

  return { mockFetch, recordedRequests };
}

test("Model metadata & calibrated walk-forward audit artifacts are valid", () => {
  const meta = getModelMetadata();
  assert.equal(meta.schema_version, "flowregime-edge-mlp-v1");
  assert.equal(meta.regimes.length, 4);
  assert.equal(meta.feature_names.length, 12);
  assert.equal(meta.risk_defaults.max_kelly_fraction, 0.25);
  assert.equal(meta.risk_defaults.hard_drawdown_stop, 0.08);

  const bt = getWalkforwardMetrics();
  assert.equal(bt.methodology.lookahead_leakage, false);
  assert.equal(bt.methodology.folds, 5);
  assert.ok(bt.methodology.embargo_days >= 7, "embargo must be >= 7d label horizon");
  assert.equal(bt.folds.length, 5);
  assert.ok(bt.equity_curve.length >= 20);
  assert.ok(bt.drawdown_reduction_pct > 25, "strategy must materially reduce max drawdown vs BTC B&H");
  assert.ok(bt.flowregime_strategy.max_drawdown_pct <= 8.0, "OOS max drawdown must stay inside 8% circuit breaker");
});

test("SoSoValue ETF history parser respects T+1 settlement nulls & chronological sort", () => {
  const parsed = parseSoSoEtfHistory([
    { date: "2026-11-24", total_net_inflow: null, total_net_assets: 95e9 },
    { date: "2026-11-23", total_net_inflow: 280e6, total_net_assets: 94.8e9, cum_net_inflow: 41e9 },
    { date: "2026-11-22", total_net_inflow: 150e6, total_net_assets: 94.5e9, cum_net_inflow: 40.72e9 },
  ]);
  assert.equal(parsed.intradaySettlementPending, true);
  assert.equal(parsed.series.length, 2);
  assert.equal(parsed.series[0].date, "2026-11-22");
  assert.equal(parsed.latestSettled.date, "2026-11-23");
  assert.equal(parsed.latestSettled.total_net_inflow, 280e6);

  const flowStats = computeFlowMetrics([100e6, -50e6, 200e6, 250e6, 300e6, 320e6, 400e6]);
  assert.equal(flowStats.consecutive_inflow_days, 5);
  assert.equal(flowStats.consecutive_outflow_days, 0);
  assert.ok(flowStats.flow_zscore_7d >= -3.5 && flowStats.flow_zscore_7d <= 3.5);
});

test("SoSoValue client authenticates with x-soso-api-key when configured", async () => {
  const { mockFetch, recordedRequests } = createMockFetch({ enableSoSo: true });
  const bundle = await fetchMarketBundle(
    { SOSOVALUE_API_KEY: "test_soso_key_redacted" },
    { fetchImpl: mockFetch }
  );

  assert.equal(bundle.data_source, "sosovalue_openapi_v1");
  assert.equal(bundle.sosovalue_api_status.configured, true);
  assert.equal(bundle.sosovalue_api_status.live_connected, true);
  assert.equal(bundle.sosovalue_api_status.rate_limit_remaining, "94");
  assert.equal(bundle.etf_flows.is_official_sosovalue_etf, true);
  assert.equal(bundle.etf_flows.intraday_settlement_pending, true);
  assert.equal(bundle.ssi_index.price, 0.9125);
  assert.ok(bundle.news[0].title.includes("IBIT"));

  const sosoReqs = recordedRequests.filter((r) => r.url.includes("openapi.sosovalue.com"));
  assert.ok(sosoReqs.length >= 4);
  for (const r of sosoReqs) {
    assert.equal(r.headers["x-soso-api-key"], "test_soso_key_redacted");
  }
});

test("SoSoValue client gracefully falls back to public proxy & offline snapshot", async () => {
  const { mockFetch } = createMockFetch({ enableSoSo: false });
  const proxyBundle = await fetchMarketBundle({}, { fetchImpl: mockFetch });
  assert.equal(proxyBundle.data_source, "public_market_proxy_fallback");
  assert.equal(proxyBundle.sosovalue_api_status.configured, false);
  assert.equal(proxyBundle.etf_flows.is_official_sosovalue_etf, false);
  assert.ok(proxyBundle.spot.btc_closes.length >= 30);

  const { mockFetch: failFetch } = createMockFetch({ failAll: true });
  const offlineBundle = await fetchMarketBundle({}, { fetchImpl: failFetch });
  assert.equal(offlineBundle.data_source, "embedded_deterministic_snapshot");
  assert.ok(offlineBundle.spot.btc_closes.length >= 30);
});

test("Edge inference produces calibrated probabilities, forecasts & drivers in <5ms", async () => {
  const { mockFetch } = createMockFetch({ enableSoSo: true });
  const bundle = await fetchMarketBundle({ SOSOVALUE_API_KEY: "demo_key" }, { fetchImpl: mockFetch });
  const features = extractFeatureVector(bundle);
  assert.equal(features.vector.length, 12);
  for (const v of features.vector) {
    assert.ok(Number.isFinite(v), "feature must be finite");
  }

  const inf = runEdgeInference(features);
  assert.ok(REGIME_LABELS.includes(inf.regime));
  const probSum = Object.values(inf.probabilities).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(probSum - 1.0) < 0.01, `probabilities sum to ${probSum}`);
  assert.ok(inf.inference_latency_ms < 25);
  assert.equal(inf.top_drivers.length, 5);
  assert.ok(inf.forecasts.expected_vol_72h_annualized >= 0.15 && inf.forecasts.expected_vol_72h_annualized <= 1.6);
});

test("Fractional-Kelly cap (<=0.25x) & Hard 8% Drawdown Circuit-Breaker invariants hold", () => {
  const bullInference = {
    regime: "ETF_MOMENTUM_EXPANSION",
    confidence: 0.78,
    probabilities: {
      ACCUMULATION_BULL: 0.16,
      ETF_MOMENTUM_EXPANSION: 0.78,
      HIGH_VOL_CHOP: 0.04,
      DISTRIBUTION_DRAWDOWN: 0.02,
    },
    probabilities_array: [0.16, 0.78, 0.04, 0.02],
    forecasts: {
      expected_return_24h: 0.075, // Extreme bullish return to stress-test Kelly cap
      expected_vol_72h_annualized: 0.25,
    },
  };
  const bullFeatures = {
    named: { btc_ret_7d: 0.09, btc_ret_30d: 0.22, flow_zscore_7d: 2.1, drawdown_30d: -0.01 },
  };

  // Even if caller passes kelly_cap: 2.0, engine strictly enforces <= 0.25x Kelly
  const normal = computeAllocationAndGuardrails(
    bullInference,
    bullFeatures,
    { capital_usd: 100000, target_vol_pct: 28, current_drawdown_pct: 0, max_drawdown_stop_pct: 8, kelly_cap: 2.0 },
    { BTC: 65000, ETH: 2300, "MAG7.ssi": 0.9 }
  );
  assert.ok(normal.sizing_math.fractional_kelly <= 0.25, "fractional Kelly must NEVER exceed 0.25");
  assert.equal(normal.sizing_math.kelly_cap_max, 0.25);
  assert.equal(normal.guardrails.circuit_breaker_status, "ARMED_NORMAL");
  assert.ok(normal.gross_risk_exposure_pct > 40, "bullish expansion should deploy risk capital");

  const weightSum = Object.values(normal.target_weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(weightSum - 1.0) < 0.002, `weights must sum to 1 (got ${weightSum})`);
  assert.equal(normal.sodex_execution_intent.non_custodial, true);
  assert.equal(normal.sodex_execution_intent.network, "ValueChain");
  assert.ok(normal.sodex_execution_intent.orders.length >= 3);

  // Pre-stop taper at 6% drawdown (between 4% and 8%)
  const tapered = computeAllocationAndGuardrails(
    bullInference,
    bullFeatures,
    { capital_usd: 100000, target_vol_pct: 28, current_drawdown_pct: 6, max_drawdown_stop_pct: 8 }
  );
  assert.equal(tapered.guardrails.circuit_breaker_status, "PRE_STOP_TAPER");
  assert.ok(tapered.gross_risk_exposure_pct < normal.gross_risk_exposure_pct);

  // Hard circuit-breaker trip at >= 8% drawdown -> 100% USDC cash halt
  const tripped = computeAllocationAndGuardrails(
    bullInference,
    bullFeatures,
    { capital_usd: 100000, target_vol_pct: 28, current_drawdown_pct: 8.5, max_drawdown_stop_pct: 8 }
  );
  assert.equal(tripped.guardrails.circuit_breaker_status, "CIRCUIT_BREAKER_TRIPPED");
  assert.equal(tripped.allocation_mode, "HARD_DRAWDOWN_STOP_HALT");
  assert.equal(tripped.target_weights.BTC, 0);
  assert.equal(tripped.target_weights.ETH, 0);
  assert.equal(tripped.target_weights["MAG7.ssi"], 0);
  assert.equal(tripped.target_weights.USDC, 1);
});

test("Worker HTTP routes serve UI, health, regime, etf-flows, backtest & simulate-rebalance", async () => {
  clearMarketCache();
  const { mockFetch } = createMockFetch({ enableSoSo: true });
  const env = { SOSOVALUE_API_KEY: "test_soso_key" };

  // GET /
  const uiRes = await handleRequest(new Request("https://flowregime.local/"), env, { fetchImpl: mockFetch });
  assert.equal(uiRes.status, 200);
  assert.match(uiRes.headers.get("content-type"), /text\/html/);
  const html = await uiRes.text();
  assert.ok(html.includes("FlowRegime One"));
  assert.ok(html.includes("SoDEX"));
  assert.ok(html.includes("Walk-Forward Audit"));

  // GET /health
  const healthRes = await handleRequest(new Request("https://flowregime.local/health"), env, { fetchImpl: mockFetch });
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, "ok");
  assert.equal(health.service, "upswing-flowregime");
  assert.equal(health.organization, "Upswing-Labs");
  assert.equal(health.sosovalue_api_key_configured, true);

  // GET /api/v1/regime
  const regRes = await handleRequest(new Request("https://flowregime.local/api/v1/regime"), env, { fetchImpl: mockFetch });
  assert.equal(regRes.status, 200);
  const reg = await regRes.json();
  assert.equal(reg.data_source, "sosovalue_openapi_v1");
  assert.ok(REGIME_LABELS.includes(reg.inference.regime));
  assert.ok(reg.allocation.sodex_execution_intent.schema === "sodex.rebalance.intent/v1");

  // GET /api/v1/etf-flows
  const etfRes = await handleRequest(new Request("https://flowregime.local/api/v1/etf-flows"), env, { fetchImpl: mockFetch });
  assert.equal(etfRes.status, 200);
  const etf = await etfRes.json();
  assert.equal(etf.etf_flows.is_official_sosovalue_etf, true);
  assert.equal(typeof etf.etf_flows.btc.flow_zscore_7d, "number");
  assert.equal(typeof etf.etf_flows.btc.flow_zscore_30d, "number");

  // POST /api/v1/simulate-rebalance (bullish scenario + tripped circuit breaker)
  const simBullRes = await handleRequest(
    new Request("https://flowregime.local/api/v1/simulate-rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capital_usd: 75000,
        target_vol_pct: 30,
        current_drawdown_pct: 0,
        scenario: "bull_expansion",
      }),
    }),
    env,
    { fetchImpl: mockFetch }
  );
  assert.equal(simBullRes.status, 200);
  const simBull = await simBullRes.json();
  assert.equal(simBull.scenario_override, true);
  assert.equal(simBull.regime, "ETF_MOMENTUM_EXPANSION");
  assert.ok(simBull.allocation.gross_risk_exposure_pct > 25);

  const simStopRes = await handleRequest(
    new Request("https://flowregime.local/api/v1/simulate-rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capital_usd: 75000,
        current_drawdown_pct: 9.5,
        max_drawdown_stop_pct: 8,
        scenario: "bull_expansion",
      }),
    }),
    env,
    { fetchImpl: mockFetch }
  );
  assert.equal(simStopRes.status, 200);
  const simStop = await simStopRes.json();
  assert.equal(simStop.allocation.guardrails.circuit_breaker_status, "CIRCUIT_BREAKER_TRIPPED");
  assert.equal(simStop.allocation.target_weights.USDC, 1);

  // POST /api/v1/simulate-rebalance invalid JSON -> 400
  const badRes = await handleRequest(
    new Request("https://flowregime.local/api/v1/simulate-rebalance", {
      method: "POST",
      body: "{bad-json",
    }),
    env,
    { fetchImpl: mockFetch }
  );
  assert.equal(badRes.status, 400);

  // GET /api/v1/backtest
  const btRes = await handleRequest(new Request("https://flowregime.local/api/v1/backtest"), env, { fetchImpl: mockFetch });
  assert.equal(btRes.status, 200);
  const bt = await btRes.json();
  assert.equal(bt.methodology.lookahead_leakage, false);

  // OPTIONS CORS + 404
  const optRes = await handleRequest(new Request("https://flowregime.local/api/v1/regime", { method: "OPTIONS" }), env);
  assert.equal(optRes.status, 204);
  const notFound = await handleRequest(new Request("https://flowregime.local/does-not-exist"), env);
  assert.equal(notFound.status, 404);
});
