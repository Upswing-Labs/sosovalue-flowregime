# FlowRegime One

> **The One-Person Quantitative Crypto ETF & Volatility Regime Desk**  
> Built by **Upswing-Labs** for **AKINDO WaveHack Wave 3: One-Person On-Chain Finance with SoSoValue**

**FlowRegime One** bridges institutional quantitative research and one-click non-custodial execution for solo crypto operators. It combines **SoSoValue OpenAPI v1** (US Spot BTC/ETH ETF inflows, `MAG7.ssi` index snapshots, institutional news) with a **Google Colab A100/L4 PyTorch Temporal Convolutional + Multi-Head Attention (TCN-Attn)** regime model knowledge-distilled into `<1ms` edge inference running on **$0-infrastructure Cloudflare Workers**.

---

## Architecture (`Insight -> Signal -> Guardrail -> Execution Intent`)

```text
+---------------------------------------------------------------------------------+
|  OFFLINE QUANT GPU LAB (Google Colab A100/L4 — Zero Runtime GPU Cost)           |
|  colab/FlowRegime_Quant_GPU_Colab.ipynb                                         |
|  Real History (SoSoValue ETF / Kraken OHLCV / DefiLlama Stables / Fear & Greed) |
|    -> 12-Factor Non-Leaking Features -> PyTorch Causal TCN + Multi-Head Attn    |
|    -> 5-Fold Purged Expanding Walk-Forward CV (10-Day Embargo >= 7d Horizon)    |
|    -> Knowledge Distillation -> src/model_weights.json + walkforward_metrics.json|
+----------------------------------------+----------------------------------------+
                                         | drop-in JSON weights (< 6 KB)
                                         v
+---------------------------------------------------------------------------------+
|  $0-INFRA EDGE QUANT DESK (Cloudflare Worker: upswing-flowregime)               |
|                                                                                 |
|  1. src/sosovalue_client.mjs                                                    |
|     - Primary: SoSoValue OpenAPI v1 (header: x-soso-api-key)                    |
|       * GET /openapi/v1/etfs/summary-history?symbol=BTC&country_code=US&limit=30|
|       * GET /openapi/v1/etfs/summary-history?symbol=ETH&country_code=US&limit=30|
|       * GET /openapi/v1/indices/ssimag7/market-snapshot                         |
|       * GET /openapi/v1/news?page=1&page_size=6                                 |
|       * GET /openapi/v1/market/overview                                         |
|     - T+1 Settlement Guard (detects null intraday ETF flow rows cleanly)        |
|     - Transparent Live Fallback (Kraken/Coinbase + DefiLlama + Fear & Greed)    |
|                                                                                 |
|  2. src/regime_engine.mjs (< 1ms Deterministic Edge Inference)                  |
|     - 4 Regimes: ACCUMULATION_BULL | ETF_MOMENTUM_EXPANSION |                   |
|                  HIGH_VOL_CHOP     | DISTRIBUTION_DRAWDOWN                      |
|     - Calibrated 24h/72h Expected Return & Annualized Volatility Forecasts      |
|     - Fractional-Kelly Sizer (strictly capped <= 0.25x Kelly)                   |
|     - Volatility-Targeting Allocator across BTC / ETH / MAG7.ssi / USDC         |
|     - Hard Drawdown Circuit-Breaker (pre-taper at 4%, 100% USDC halt at 8%)     |
|                                                                                 |
|  3. src/index.mjs + src/ui.mjs                                                  |
|     - Institutional Dark Quant Terminal UI (zero external CDNs)                 |
|     - REST JSON API + Interactive Rebalance Simulator + SoDEX Intent Exporter   |
+---------------------------------------------------------------------------------+
```

---

## Verified Purged Walk-Forward Out-of-Sample Results

Reproducible via `python scripts/calibrate_baseline.py` or `colab/FlowRegime_Quant_GPU_Colab.ipynb` on real historical daily bars (**684 aligned days**, **445 OOS test days** from `2025-08-30` to `2026-11-17`, **5 expanding folds**, **10-day embargo gap >= 7d label horizon**, **6 bps** rebalance friction, zero lookahead leakage):

| Metric | FlowRegime One (OOS) | BTC Buy & Hold | Delta |
| --- | ---: | ---: | ---: |
| **Total OOS Return** | **+2.28%** | -48.42% | **+50.70 pp** |
| **CAGR** | **+1.86%** | -41.90% | **+43.76 pp** |
| **Sharpe Ratio** | **+0.490** | -1.033 | **+1.523** |
| **Sortino Ratio** | **+0.688** | -1.384 | **+2.072** |
| **Max Drawdown** | **-3.76%** | -56.81% | **-53.05 pp risk cut** |
| **Calmar Ratio** | **+0.495** | -0.737 | **+1.232** |
| **Annualized Volatility** | **3.92%** | 43.38% | **-39.46 pp** |
| **Daily Hit Rate** | **79.33%** | 48.31% | **+31.02 pp** |
| **4-Class Regime OOS Accuracy** | **36.40%** | 25.00% (chance) | **+11.40 pp** |

---

## Quick Start & Local Verification

```bash
cd products/sosovalue_flowregime

# 1. Run full Node built-in test suite (zero external npm deps required)
npm test

# 2. (Optional) Re-calibrate baseline weights from live Kraken + DefiLlama + Fear & Greed history
npm run calibrate

# 3. Start local Cloudflare Worker dev server
npm run dev
```

---

## Deploy to Cloudflare Workers (`$0` Free Tier)

Zero secrets are hardcoded in `wrangler.jsonc` or source files. Bind your SoSoValue OpenAPI key securely as a Cloudflare Worker secret:

```bash
cd products/sosovalue_flowregime

# Optional: unlock live official SoSoValue US Spot ETF inflows, MAG7.ssi & institutional news
npx wrangler secret put SOSOVALUE_API_KEY

# Deploy to Cloudflare Workers ($0/month free tier: 100,000 requests/day)
npx wrangler deploy
```

> **Note:** Even before `SOSOVALUE_API_KEY` is bound, FlowRegime One runs with zero crashes by streaming live public Kraken/Coinbase OHLCV, DefiLlama stablecoin liquidity flows, and Alternative.me Fear & Greed with an explicit data-source transparency badge in both UI and API responses.

---

## REST API Reference

| Method & Route | Description |
| --- | --- |
| `GET /` | Self-contained institutional dark-mode Quant Terminal UI |
| `GET /health` | Health check, model version metadata, and `SOSOVALUE_API_KEY` binding status |
| `GET /api/v1/regime` | Live edge regime probabilities, 24h/72h forecasts, feature drivers, allocation & SoDEX intent |
| `GET /api/v1/etf-flows` | 30-day BTC/ETH ETF net flows, 7d/30d momentum Z-scores, streaks & T+1 settlement flag |
| `POST /api/v1/simulate-rebalance` | Interactive fractional-Kelly (`<= 0.25x`), vol-target, drawdown circuit-breaker & stress-test simulator |
| `GET /api/v1/backtest` | Full 5-fold purged walk-forward audit JSON + equity curve vs BTC Buy & Hold |

---

## Security & Non-Custodial Guarantee

- **Zero private keys or signing secrets on edge** — exports unsigned `sodex.rebalance.intent/v1` JSON tickets requiring explicit user wallet confirmation on ValueChain / SoDEX.
- **Zero hardcoded API keys** — `SOSOVALUE_API_KEY` is read exclusively from Cloudflare Worker encrypted secret bindings.
- **Zero third-party frontend CDNs** — pure self-contained HTML/CSS/SVG/JS with strict response security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
