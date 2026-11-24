/**
 * FlowRegime One — Deterministic Edge Inference, Fractional-Kelly Sizer & Guardrail Engine
 *
 * Loads Colab-distilled / walk-forward calibrated `model_weights.json` (12 -> 16 tanh -> 6 MLP)
 * and executes in <1ms directly inside a Cloudflare Worker with ZERO runtime GPU cost.
 *
 * Risk Architecture:
 *   - Fractional Kelly cap: strictly <= 0.25x Kelly
 *   - Volatility-targeting allocator across BTC / ETH / MAG7.ssi / USDC
 *   - Hard drawdown circuit-breaker: default max_dd_stop = 8.0% (pre-taper at 4.0%, full cash halt >= 8.0%)
 *   - Non-custodial SoDEX / ValueChain rebalance intent generator
 */

import modelWeights from "./model_weights.json" with { type: "json" };
import walkforwardMetrics from "./walkforward_metrics.json" with { type: "json" };

export const REGIME_LABELS = Object.freeze([
  "ACCUMULATION_BULL",
  "ETF_MOMENTUM_EXPANSION",
  "HIGH_VOL_CHOP",
  "DISTRIBUTION_DRAWDOWN",
]);

export const REGIME_META = Object.freeze({
  ACCUMULATION_BULL: {
    code: "ACCUMULATION_BULL",
    title: "Accumulation Bull",
    bias: "CONSTRUCTIVE",
    color: "#10b981",
    summary: "Contained realized volatility with constructive spot & ETF accumulation. Deploy vol-targeted core exposure.",
  },
  ETF_MOMENTUM_EXPANSION: {
    code: "ETF_MOMENTUM_EXPANSION",
    title: "ETF Momentum Expansion",
    bias: "RISK_ON",
    color: "#38bdf8",
    summary: "Positive ETF/liquidity inflow impulse confirming upside breakout. Expand beta tilt across BTC, ETH, and MAG7.ssi.",
  },
  HIGH_VOL_CHOP: {
    code: "HIGH_VOL_CHOP",
    title: "High-Vol Chop",
    bias: "DEFENSIVE",
    color: "#f59e0b",
    summary: "Elevated short-term realized volatility without directional edge. Compress risk budget and hold USDC buffer.",
  },
  DISTRIBUTION_DRAWDOWN: {
    code: "DISTRIBUTION_DRAWDOWN",
    title: "Distribution Drawdown",
    bias: "CAPITAL_PRESERVATION",
    color: "#ef4444",
    summary: "Downside trend breakdown with negative institutional flow momentum. Activate defensive USDC capital preservation.",
  },
});

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
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

export function softmax(logits) {
  const m = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(clamp(z - m, -30, 30)));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

/**
 * Extract the 12 model features from a normalized marketBundle produced by `fetchMarketBundle`.
 */
export function extractFeatureVector(marketBundle) {
  const btc = marketBundle?.spot?.btc_closes || [];
  const highs = marketBundle?.spot?.btc_highs || btc;
  const eth = marketBundle?.spot?.eth_closes || [];
  const sol = marketBundle?.spot?.sol_closes || [];

  const n = Math.min(btc.length, eth.length, sol.length);
  if (n < 8) {
    throw new Error(`Insufficient spot history bars for regime inference (got ${n}, need >= 8)`);
  }

  const btcSlice = btc.slice(-n);
  const highSlice = highs.slice(-n);
  const ethSlice = eth.slice(-n);
  const solSlice = sol.slice(-n);

  const btcLogRets = [];
  for (let i = 1; i < n; i++) {
    btcLogRets.push(Math.log(Math.max(btcSlice[i], 1e-6) / Math.max(btcSlice[i - 1], 1e-6)));
  }

  const last = n - 1;
  const idx7 = Math.max(0, last - 7);
  const idx30 = Math.max(0, last - Math.min(30, last));

  const btc_ret_1d = Math.log(btcSlice[last] / btcSlice[last - 1]);
  const btc_ret_7d = Math.log(btcSlice[last] / btcSlice[idx7]);
  const btc_ret_30d = Math.log(btcSlice[last] / btcSlice[idx30]);
  const eth_ret_7d = Math.log(ethSlice[last] / ethSlice[idx7]);
  const sol_ret_7d = Math.log(solSlice[last] / solSlice[idx7]);

  const eth_btc_rel_7d = eth_ret_7d - btc_ret_7d;
  const sol_btc_rel_7d = sol_ret_7d - btc_ret_7d;

  const realized_vol_7d = std(btcLogRets.slice(-7)) * Math.sqrt(365);
  const realized_vol_30d = std(btcLogRets.slice(-Math.min(30, btcLogRets.length))) * Math.sqrt(365);
  const vol_ratio_7_30 = realized_vol_7d / Math.max(realized_vol_30d, 0.08);

  const flow_zscore_7d = clamp(Number(marketBundle?.etf_flows?.btc?.flow_zscore_7d ?? 0), -3.5, 3.5);
  const flow_zscore_30d = clamp(Number(marketBundle?.etf_flows?.btc?.flow_zscore_30d ?? 0), -3.5, 3.5);

  const peak30 = Math.max(...highSlice.slice(-Math.min(30, highSlice.length)));
  const drawdown_30d = (btcSlice[last] - peak30) / Math.max(peak30, 1);

  const fg = Number(marketBundle?.sentiment?.fear_greed_index ?? 50);
  const sentiment_norm = clamp((fg - 50) / 50, -1, 1);

  const named = {
    btc_ret_1d: Number(btc_ret_1d.toFixed(6)),
    btc_ret_7d: Number(btc_ret_7d.toFixed(6)),
    btc_ret_30d: Number(btc_ret_30d.toFixed(6)),
    eth_btc_rel_7d: Number(eth_btc_rel_7d.toFixed(6)),
    sol_btc_rel_7d: Number(sol_btc_rel_7d.toFixed(6)),
    realized_vol_7d: Number(realized_vol_7d.toFixed(6)),
    realized_vol_30d: Number(realized_vol_30d.toFixed(6)),
    vol_ratio_7_30: Number(vol_ratio_7_30.toFixed(6)),
    flow_zscore_7d: Number(flow_zscore_7d.toFixed(6)),
    flow_zscore_30d: Number(flow_zscore_30d.toFixed(6)),
    drawdown_30d: Number(drawdown_30d.toFixed(6)),
    sentiment_norm: Number(sentiment_norm.toFixed(6)),
  };

  const vector = [
    named.btc_ret_1d,
    named.btc_ret_7d,
    named.btc_ret_30d,
    named.eth_btc_rel_7d,
    named.sol_btc_rel_7d,
    named.realized_vol_7d,
    named.realized_vol_30d,
    named.vol_ratio_7_30,
    named.flow_zscore_7d,
    named.flow_zscore_30d,
    named.drawdown_30d,
    named.sentiment_norm,
  ];

  return { named, vector };
}

/**
 * Deterministic <1ms forward pass of the distilled edge neural network (`model_weights.json`).
 */
export function runEdgeInference(featureInput, weights = modelWeights) {
  const t0 = performance.now();
  const vector = Array.isArray(featureInput) ? featureInput : featureInput.vector;
  const featureNames = weights.feature_names;
  const { mean: means, std: stds, clip = 4.5 } = weights.scaler;
  const { w1, b1, w2, b2 } = weights.layers;

  if (!Array.isArray(vector) || vector.length !== means.length) {
    throw new Error(`Expected ${means.length} features, received ${vector?.length}`);
  }

  // Z-score standardization matching training fold scaler
  const xz = vector.map((v, k) => clamp((v - means[k]) / Math.max(stds[k], 1e-6), -clip, clip));

  // Layer 1: Linear + tanh
  const hidden = new Array(b1.length);
  for (let j = 0; j < b1.length; j++) {
    let z = b1[j];
    const row = w1[j];
    for (let k = 0; k < xz.length; k++) {
      z += row[k] * xz[k];
    }
    hidden[j] = Math.tanh(z);
  }

  // Layer 2: Multi-task output heads (4 regime logits + 24h expected return + 72h expected vol)
  const out = new Array(b2.length);
  for (let o = 0; o < b2.length; o++) {
    let z = b2[o];
    const row = w2[o];
    for (let j = 0; j < hidden.length; j++) {
      z += row[j] * hidden[j];
    }
    out[o] = z;
  }

  const probs = softmax(out.slice(0, 4));
  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  const regimes = weights.regimes || REGIME_LABELS;
  const topRegime = regimes[bestIdx];
  const regimeProbMap = {};
  for (let i = 0; i < regimes.length; i++) {
    regimeProbMap[regimes[i]] = Number(probs[i].toFixed(4));
  }

  const retScale = weights.output_heads?.exp_return_24h_scale ?? 0.08;
  const volMin = weights.output_heads?.exp_vol_72h_min ?? 0.15;
  const volSpan = weights.output_heads?.exp_vol_72h_span ?? 1.45;

  const expRet24h = Math.tanh(out[4]) * retScale;
  // Smooth multi-day drift projection tempered by regime persistence
  const expRet72h = clamp(expRet24h * 2.15, -0.16, 0.16);
  const expVolAnn = volMin + volSpan / (1 + Math.exp(-clamp(out[5], -10, 10)));

  // First-order local input sensitivity (gradient * standardized input) for explainability
  const topLogitRow = w2[bestIdx];
  const drivers = featureNames.map((name, k) => {
    let grad = 0;
    for (let j = 0; j < hidden.length; j++) {
      grad += topLogitRow[j] * (1 - hidden[j] * hidden[j]) * w1[j][k];
    }
    const impact = grad * xz[k];
    return {
      feature: name,
      raw_value: Number(vector[k].toFixed(4)),
      z_score: Number(xz[k].toFixed(3)),
      contribution: Number(impact.toFixed(4)),
    };
  });
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const latencyMs = Number(Math.max(0.01, performance.now() - t0).toFixed(3));

  return {
    model_version: weights.schema_version,
    architecture: weights.architecture,
    trained_at_utc: weights.trained_at_utc,
    regime: topRegime,
    regime_meta: REGIME_META[topRegime],
    confidence: Number(probs[bestIdx].toFixed(4)),
    probabilities: regimeProbMap,
    probabilities_array: probs,
    forecasts: {
      expected_return_24h: Number(expRet24h.toFixed(5)),
      expected_return_24h_pct: Number((expRet24h * 100).toFixed(2)),
      expected_return_72h: Number(expRet72h.toFixed(5)),
      expected_return_72h_pct: Number((expRet72h * 100).toFixed(2)),
      expected_vol_72h_annualized: Number(expVolAnn.toFixed(4)),
      expected_vol_72h_pct: Number((expVolAnn * 100).toFixed(2)),
    },
    top_drivers: drivers.slice(0, 5),
    inference_latency_ms: latencyMs,
  };
}

/**
 * Compute fractional-Kelly position sizing (<= 0.25x), volatility-targeted BTC/ETH/MAG7.ssi/USDC
 * allocation, hard drawdown circuit-breaker guardrails, rebalance trade ticket, and SoDEX intent JSON.
 */
export function computeAllocationAndGuardrails(inference, featureObj, userParams = {}, prices = {}) {
  const capitalUsd = clamp(Number(userParams.capital_usd ?? 50000) || 50000, 100, 100_000_000);
  const targetVolPct = clamp(Number(userParams.target_vol_pct ?? 28) || 28, 8, 60);
  const targetVol = targetVolPct / 100;
  const maxDdStopPct = clamp(Number(userParams.max_drawdown_stop_pct ?? 8) || 8, 3, 25);
  const maxDdStop = maxDdStopPct / 100;
  const currentDdPct = clamp(Number(userParams.current_drawdown_pct ?? 0) || 0, 0, 50);
  const currentDd = currentDdPct / 100;
  // Hard invariant: fractional Kelly multiplier NEVER exceeds 0.25x
  const kellyMultiplierCap = clamp(Number(userParams.kelly_cap ?? 0.25) || 0.25, 0.05, 0.25);

  const probs = inference.probabilities_array || REGIME_LABELS.map((r) => inference.probabilities[r] ?? 0);
  const [pAcc, pExp, pChop, pDd] = probs;
  const bullProb = pAcc + pExp;
  const riskOffProb = pDd + 0.65 * pChop;

  const expRet24h = inference.forecasts.expected_return_24h;
  const expVolAnn = Math.max(inference.forecasts.expected_vol_72h_annualized, 0.15);
  const dailyVol = Math.max(expVolAnn / Math.sqrt(365), 0.012);

  // Fractional Kelly sizing
  const rawKelly = expRet24h / (dailyVol * dailyVol);
  const fractionalKelly = clamp(rawKelly * kellyMultiplierCap, 0, kellyMultiplierCap);

  // Volatility targeting scalar
  const volScalar = clamp(targetVol / Math.max(expVolAnn, 0.18), 0.15, 1.0);

  const named = featureObj?.named || featureObj || {};
  const btcRet7d = Number(named.btc_ret_7d ?? 0);
  const btcRet30d = Number(named.btc_ret_30d ?? 0);
  const flowZ7 = Number(named.flow_zscore_7d ?? 0);
  const dd30 = Number(named.drawdown_30d ?? 0);

  const trendScore =
    0.5 * (btcRet30d > 0 ? 1 : 0) +
    0.3 * (btcRet7d > 0 ? 1 : 0) +
    0.2 * (flowZ7 > 0 ? 1 : 0);

  let baseRisk = 0;
  let allocationMode = "VOL_TARGETED_DEPLOYMENT";
  const guardrailNotes = [];

  const defensiveMacroTriggered =
    pDd >= 0.34 || (btcRet30d < -0.04 && flowZ7 < 0.35) || dd30 < -0.12;

  if (defensiveMacroTriggered) {
    baseRisk = 0;
    allocationMode = "CAPITAL_PRESERVATION_CASH";
    guardrailNotes.push(
      "Macro drawdown/distribution gate active (negative 30d trend or elevated drawdown probability) -> rotated to 100% USDC carry."
    );
  } else {
    const conviction = Math.max(0, bullProb - riskOffProb);
    baseRisk = clamp(
      (0.65 * conviction * (0.4 + 0.6 * trendScore) + 1.15 * fractionalKelly) * volScalar,
      0,
      0.85
    );
    if (baseRisk < 0.08) {
      baseRisk = 0;
      allocationMode = "LOW_EDGE_CASH_WAIT";
      guardrailNotes.push("Signal conviction below 8% minimum turnover hurdle -> holding USDC to avoid chop whipsaw.");
    }
  }

  // Hard drawdown circuit-breaker (tapers smoothly from 50% of stop; hard halt to 0% risk >= maxDdStop)
  let circuitBreakerStatus = "ARMED_NORMAL";
  let circuitBreakerMultiplier = 1.0;
  if (currentDd >= maxDdStop) {
    circuitBreakerStatus = "CIRCUIT_BREAKER_TRIPPED";
    circuitBreakerMultiplier = 0.0;
    baseRisk = 0.0;
    allocationMode = "HARD_DRAWDOWN_STOP_HALT";
    guardrailNotes.push(
      `HARD DRAWDOWN CIRCUIT BREAKER TRIPPED (${currentDdPct.toFixed(1)}% >= ${maxDdStopPct.toFixed(1)}% stop) -> forced 100% USDC defensive preservation.`
    );
  } else if (currentDd >= maxDdStop * 0.5) {
    circuitBreakerStatus = "PRE_STOP_TAPER";
    circuitBreakerMultiplier = clamp(
      1 - (currentDd - maxDdStop * 0.5) / (maxDdStop * 0.5),
      0,
      1
    );
    baseRisk *= circuitBreakerMultiplier;
    guardrailNotes.push(
      `Drawdown pre-stop taper active (${currentDdPct.toFixed(1)}% drawdown) -> risk scaled by ${(circuitBreakerMultiplier * 100).toFixed(0)}%.`
    );
  }

  const btcWeight = Number((baseRisk * (pExp >= pAcc ? 0.56 : 0.64)).toFixed(4));
  const ethWeight = Number((baseRisk * (pExp >= pAcc ? 0.24 : 0.18)).toFixed(4));
  const ssiWeight = Number((baseRisk * (pExp >= pAcc ? 0.20 : 0.18)).toFixed(4));
  const usdcWeight = Number(Math.max(0, 1 - btcWeight - ethWeight - ssiWeight).toFixed(4));

  const targetWeights = {
    BTC: btcWeight,
    ETH: ethWeight,
    "MAG7.ssi": ssiWeight,
    USDC: usdcWeight,
  };

  // Current holdings default to 100% USDC if unspecified
  const rawHoldings = userParams.current_holdings_usd || {};
  const hasCustomHoldings = ["BTC", "ETH", "MAG7.ssi", "SSI", "USDC"].some(
    (k) => Number(rawHoldings[k] ?? 0) > 0
  );
  const currentUsd = hasCustomHoldings
    ? {
        BTC: Math.max(0, Number(rawHoldings.BTC ?? 0)),
        ETH: Math.max(0, Number(rawHoldings.ETH ?? 0)),
        "MAG7.ssi": Math.max(0, Number(rawHoldings["MAG7.ssi"] ?? rawHoldings.SSI ?? 0)),
        USDC: Math.max(0, Number(rawHoldings.USDC ?? 0)),
      }
    : {
        BTC: 0,
        ETH: 0,
        "MAG7.ssi": 0,
        USDC: capitalUsd,
      };

  const effectiveCapital = hasCustomHoldings
    ? Math.max(100, currentUsd.BTC + currentUsd.ETH + currentUsd["MAG7.ssi"] + currentUsd.USDC)
    : capitalUsd;

  const assetPrices = {
    BTC: Number(prices.BTC || 60000),
    ETH: Number(prices.ETH || 1700),
    "MAG7.ssi": Number(prices["MAG7.ssi"] || 0.78),
    USDC: 1.0,
  };

  const tickets = ["BTC", "ETH", "MAG7.ssi", "USDC"].map((asset) => {
    const targetUsd = Number((effectiveCapital * targetWeights[asset]).toFixed(2));
    const curUsd = Number(currentUsd[asset].toFixed(2));
    const deltaUsd = Number((targetUsd - curUsd).toFixed(2));
    const absDelta = Math.abs(deltaUsd);
    const minTicket = Math.max(25, effectiveCapital * 0.005);
    const action =
      asset === "USDC"
        ? deltaUsd > minTicket
          ? "RETAIN_CASH"
          : deltaUsd < -minTicket
            ? "DEPLOY_CASH"
            : "HOLD"
        : deltaUsd > minTicket
          ? "BUY"
          : deltaUsd < -minTicket
            ? "SELL"
            : "HOLD";

    const price = assetPrices[asset];
    const estUnits = price > 0 ? Number((absDelta / price).toFixed(asset === "USDC" ? 2 : 6)) : 0;

    return {
      asset,
      venue: asset === "USDC" ? "ValueChain Vault" : "SoDEX Spot/SSI Pool",
      pair: asset === "USDC" ? "USDC" : `${asset}-USDC`,
      target_weight_pct: Number((targetWeights[asset] * 100).toFixed(2)),
      target_usd: targetUsd,
      current_usd: curUsd,
      delta_usd: deltaUsd,
      action,
      reference_price_usd: price,
      estimated_units: estUnits,
      est_slippage_bps: asset === "USDC" ? 0 : asset === "MAG7.ssi" ? 15 : 8,
    };
  });

  const executableOrders = tickets
    .filter((t) => t.asset !== "USDC" && (t.action === "BUY" || t.action === "SELL"))
    .map((t) => ({
      market: t.pair,
      side: t.action,
      notional_usd: Math.abs(t.delta_usd),
      estimated_quantity: t.estimated_units,
      limit_slippage_bps: 25,
      time_in_force: "IOC",
      route: t.asset === "MAG7.ssi" ? "SoDEX_SSI_ROUTER" : "SoDEX_CLOB_SPOT",
    }));

  const estimatedAnnualVolPct = Number((baseRisk * expVolAnn * 100).toFixed(2));
  const sodexIntent = {
    schema: "sodex.rebalance.intent/v1",
    generated_at_utc: new Date().toISOString(),
    network: "ValueChain",
    execution_venue: "SoDEX",
    non_custodial: true,
    requires_user_wallet_signature: true,
    regime_context: {
      regime: inference.regime,
      confidence: inference.confidence,
      circuit_breaker_status: circuitBreakerStatus,
      fractional_kelly: Number(fractionalKelly.toFixed(4)),
    },
    portfolio_usd: Number(effectiveCapital.toFixed(2)),
    target_weights: targetWeights,
    orders: executableOrders,
    guardrails: {
      max_kelly_cap: kellyMultiplierCap,
      target_vol_pct: targetVolPct,
      hard_drawdown_stop_pct: maxDdStopPct,
      max_single_order_slippage_bps: 25,
    },
  };

  return {
    capital_usd: Number(effectiveCapital.toFixed(2)),
    allocation_mode: allocationMode,
    gross_risk_exposure_pct: Number(((1 - usdcWeight) * 100).toFixed(2)),
    cash_buffer_pct: Number((usdcWeight * 100).toFixed(2)),
    estimated_portfolio_vol_pct: estimatedAnnualVolPct,
    target_weights: targetWeights,
    sizing_math: {
      raw_kelly: Number(rawKelly.toFixed(4)),
      kelly_cap_max: kellyMultiplierCap,
      fractional_kelly: Number(fractionalKelly.toFixed(4)),
      vol_target_scalar: Number(volScalar.toFixed(4)),
      trend_confirmation_score: Number(trendScore.toFixed(2)),
    },
    guardrails: {
      circuit_breaker_status: circuitBreakerStatus,
      circuit_breaker_multiplier: Number(circuitBreakerMultiplier.toFixed(3)),
      current_drawdown_pct: Number(currentDdPct.toFixed(2)),
      max_drawdown_stop_pct: Number(maxDdStopPct.toFixed(2)),
      notes:
        guardrailNotes.length > 0
          ? guardrailNotes
          : ["All quantitative risk guardrails green — position within Kelly & volatility budget."],
    },
    trade_tickets: tickets,
    sodex_execution_intent: sodexIntent,
  };
}

export function getWalkforwardMetrics() {
  return walkforwardMetrics;
}

export function getModelMetadata() {
  return {
    schema_version: modelWeights.schema_version,
    architecture: modelWeights.architecture,
    trained_at_utc: modelWeights.trained_at_utc,
    training_window: modelWeights.training_window,
    regimes: modelWeights.regimes,
    feature_names: modelWeights.feature_names,
    risk_defaults: modelWeights.risk_defaults,
  };
}
