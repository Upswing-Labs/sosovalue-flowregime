/**
 * FlowRegime One — Self-Contained Institutional Dark-Mode Quant Terminal UI
 * Zero external CDN dependencies (pure inline HTML/CSS/SVG/JS).
 */

export function renderQuantTerminalHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>FlowRegime One — Quantitative Crypto ETF &amp; Volatility Regime Desk</title>
<style>
  :root {
    --bg: #060911;
    --bg-panel: #0c1220;
    --bg-elev: #111a2e;
    --border: #1d2a44;
    --border-bright: #2a3d63;
    --text: #e6edf7;
    --muted: #8b9bb8;
    --emerald: #10b981;
    --cyan: #38bdf8;
    --amber: #f59e0b;
    --crimson: #ef4444;
    --violet: #a78bfa;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: radial-gradient(circle at 12% 0%, #0e1a33 0%, var(--bg) 45%);
    color: var(--text);
    font-family: var(--sans);
    line-height: 1.48;
    min-height: 100vh;
  }
  .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .shell { max-width: 1320px; margin: 0 auto; padding: 18px 20px 48px; }

  /* Header */
  .topbar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 14px; padding: 14px 18px; background: rgba(12, 18, 32, 0.92);
    border: 1px solid var(--border); border-radius: 12px; margin-bottom: 16px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark {
    width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center;
    background: linear-gradient(135deg, #10b981, #38bdf8); color: #05101a;
    font-weight: 800; font-size: 15px; letter-spacing: -0.5px;
  }
  .brand h1 { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; }
  .brand small { display: block; color: var(--muted); font-size: 11px; }
  .topbar-right { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .ticker-strip { display: flex; flex-wrap: wrap; gap: 8px; }
  .pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px;
    border-radius: 999px; font-size: 12px; font-weight: 600;
    background: var(--bg-elev); border: 1px solid var(--border);
  }
  .pill.live-soso { border-color: rgba(16,185,129,0.55); color: #6ee7b7; background: rgba(16,185,129,0.12); }
  .pill.proxy { border-color: rgba(245,158,11,0.55); color: #fcd34d; background: rgba(245,158,11,0.12); }
  .pill.offline { border-color: rgba(239,68,68,0.55); color: #fca5a5; background: rgba(239,68,68,0.12); }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block; }

  .btn {
    background: var(--bg-elev); color: var(--text); border: 1px solid var(--border-bright);
    padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .btn:hover { border-color: var(--cyan); background: #16233d; }
  .btn.primary { background: linear-gradient(135deg, #0ea5e9, #10b981); color: #041019; border: none; }
  .btn.primary:hover { filter: brightness(1.08); }

  /* Tabs */
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
  .tab {
    padding: 8px 15px; border-radius: 8px; border: 1px solid transparent;
    background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .tab.active { background: var(--bg-elev); color: var(--text); border-color: var(--border-bright); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* Grid & Cards */
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 980px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }

  .card {
    background: var(--bg-panel); border: 1px solid var(--border); border-radius: 12px;
    padding: 16px 18px; margin-bottom: 16px;
  }
  .grid-2 .card, .grid-3 .card, .grid-4 .card { margin-bottom: 0; }
  .card-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-bottom: 12px;
  }
  .card-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.7px; color: var(--muted); font-weight: 700; }
  .tag {
    font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;
    background: var(--bg-elev); border: 1px solid var(--border); color: var(--muted);
  }
  .tag.ok { color: #6ee7b7; border-color: rgba(16,185,129,0.45); background: rgba(16,185,129,0.12); }
  .tag.warn { color: #fcd34d; border-color: rgba(245,158,11,0.45); background: rgba(245,158,11,0.12); }
  .tag.danger { color: #fca5a5; border-color: rgba(239,68,68,0.55); background: rgba(239,68,68,0.15); }
  .tag.info { color: #7dd3fc; border-color: rgba(56,189,248,0.45); background: rgba(56,189,248,0.12); }

  /* Regime Hero */
  .regime-banner {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 14px; padding: 14px 16px; border-radius: 10px; background: var(--bg-elev);
    border-left: 4px solid var(--emerald); margin-bottom: 14px;
  }
  .regime-name { font-size: 21px; font-weight: 800; letter-spacing: 0.2px; }
  .regime-desc { color: var(--muted); font-size: 13px; margin-top: 4px; max-width: 680px; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
  @media (max-width: 720px) { .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .kpi {
    background: var(--bg-elev); border: 1px solid var(--border); border-radius: 9px; padding: 10px 12px;
  }
  .kpi label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi .val { font-size: 18px; font-weight: 700; }

  /* Probability bars */
  .prob-row { display: grid; grid-template-columns: 195px 1fr 58px; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px; }
  .bar-track { height: 9px; background: #0a101d; border-radius: 99px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; border-radius: 99px; transition: width 0.25s ease; }

  /* Controls */
  .controls-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
  @media (max-width: 900px) { .controls-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .ctrl label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .ctrl input[type="number"], .ctrl select {
    width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-bright);
    background: #080d18; color: var(--text); font-size: 13px;
  }
  .ctrl input[type="range"] { width: 100%; accent-color: var(--cyan); cursor: pointer; }

  /* Allocation bar */
  .alloc-bar {
    display: flex; height: 14px; border-radius: 8px; overflow: hidden;
    background: #080d18; border: 1px solid var(--border); margin-bottom: 12px;
  }
  .alloc-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; margin-bottom: 12px; }
  .swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 5px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
  th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  td.num, th.num { text-align: right; }
  .pos { color: var(--emerald); }
  .neg { color: var(--crimson); }
  .neu { color: var(--muted); }

  /* Code / JSON box */
  pre {
    background: #070b14; border: 1px solid var(--border); border-radius: 9px;
    padding: 12px; font-family: var(--mono); font-size: 11.5px; color: #c7d7f2;
    overflow-x: auto; max-height: 280px;
  }
  .svg-wrap { width: 100%; overflow: hidden; background: #080d18; border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
  .note-box {
    background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.28);
    border-radius: 9px; padding: 10px 12px; font-size: 12.5px; color: #bae6fd; margin-bottom: 12px;
  }
  .note-box.danger {
    background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.48); color: #fecaca;
  }
  .news-item { padding: 9px 0; border-bottom: 1px solid var(--border); }
  .news-item:last-child { border-bottom: none; }
  .news-meta { font-size: 11px; color: var(--muted); margin-top: 3px; }
  footer { margin-top: 26px; text-align: center; color: var(--muted); font-size: 11.5px; }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">FR</div>
      <div>
        <h1>FlowRegime One</h1>
        <small>One-Person Quantitative Crypto ETF &amp; Volatility Regime Desk &middot; Upswing-Labs</small>
      </div>
    </div>
    <div class="topbar-right">
      <div class="ticker-strip mono" id="tickerStrip">
        <span class="pill">BTC <strong id="pxBtc">--</strong></span>
        <span class="pill">ETH <strong id="pxEth">--</strong></span>
        <span class="pill">MAG7.ssi <strong id="pxSsi">--</strong></span>
        <span class="pill">F&amp;G <strong id="pxFg">--</strong></span>
      </div>
      <span class="pill proxy" id="sourcePill"><span class="dot"></span><span id="sourceLabel">Loading live feed...</span></span>
      <button class="btn" id="btnRefresh">Refresh Signal</button>
    </div>
  </header>

  <nav class="tabs" role="tablist">
    <button class="tab active" data-tab="desk">Live Quant Desk</button>
    <button class="tab" data-tab="backtest">Walk-Forward Audit</button>
    <button class="tab" data-tab="methodology">Methodology &amp; SoSoValue API</button>
  </nav>

  <!-- TAB 1: LIVE QUANT DESK -->
  <section id="tab-desk" class="tab-panel active">
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Live Edge Regime Classifier (&lt;1ms Distilled TCN-Attn)</span>
          <span class="tag info mono" id="latencyBadge">Latency -- ms</span>
        </div>
        <div class="regime-banner" id="regimeBanner">
          <div>
            <div class="regime-name" id="regimeTitle">Loading regime...</div>
            <div class="regime-desc" id="regimeSummary">Fetching SoSoValue ETF flows &amp; spot volatility surface...</div>
          </div>
          <div class="mono" style="text-align:right">
            <div style="font-size:11px;color:var(--muted)">CONFIDENCE</div>
            <div style="font-size:24px;font-weight:800" id="regimeConf">--%</div>
          </div>
        </div>
        <div class="kpi-row mono">
          <div class="kpi"><label>24h Exp Return</label><div class="val" id="kpiRet24">--</div></div>
          <div class="kpi"><label>72h Exp Return</label><div class="val" id="kpiRet72">--</div></div>
          <div class="kpi"><label>72h Ann Vol</label><div class="val" id="kpiVol72">--</div></div>
          <div class="kpi"><label>30d Drawdown</label><div class="val" id="kpiDd30">--</div></div>
        </div>
        <div id="probBars"></div>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-title">30-Day ETF / Institutional Net Flow Momentum</span>
          <span class="tag mono" id="etfSourceTag">Loading...</span>
        </div>
        <div class="kpi-row mono">
          <div class="kpi"><label>Latest Daily Flow</label><div class="val" id="flowLatest">--</div></div>
          <div class="kpi"><label>7d Net Flow</label><div class="val" id="flow7d">--</div></div>
          <div class="kpi"><label>7d Momentum Z</label><div class="val" id="flowZ7">--</div></div>
          <div class="kpi"><label>30d Trend Z</label><div class="val" id="flowZ30">--</div></div>
        </div>
        <div class="svg-wrap" id="flowSparkline" style="min-height:178px"></div>
        <div style="margin-top:8px;font-size:11.5px;color:var(--muted)" id="flowFootnote"></div>
      </div>
    </div>

    <!-- INTERACTIVE REBALANCE SIMULATOR & SODEX EXECUTION INTENT -->
    <div class="card">
      <div class="card-head">
        <span class="card-title">Fractional-Kelly (&le; 0.25x) Allocator, Guardrails &amp; SoDEX Rebalance Ticket</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="tag ok mono" id="cbBadge">Circuit Breaker: ARMED</span>
          <span class="tag info mono" id="kellyBadge">Kelly: --</span>
          <span class="tag mono" id="volScalarBadge">Vol Scalar: --</span>
        </div>
      </div>

      <div class="controls-grid">
        <div class="ctrl">
          <label><span>Portfolio Capital (USD)</span><span class="mono" id="capVal">$50,000</span></label>
          <input type="number" id="inCapital" value="50000" min="100" max="100000000" step="1000" />
        </div>
        <div class="ctrl">
          <label><span>Target Ann. Volatility</span><span class="mono" id="volVal">28%</span></label>
          <input type="range" id="inTargetVol" min="12" max="45" value="28" step="1" />
        </div>
        <div class="ctrl">
          <label><span>Simulated Drawdown (Stop=8%)</span><span class="mono" id="ddVal">0.0%</span></label>
          <input type="range" id="inDrawdown" min="0" max="14" value="0" step="0.5" />
        </div>
        <div class="ctrl">
          <label><span>Regime Scenario Test</span><span>Live vs Stress</span></label>
          <select id="inScenario">
            <option value="live">Live Market Signal (Real-Time)</option>
            <option value="bull_expansion">Stress Test: ETF Momentum Expansion</option>
            <option value="accumulation">Stress Test: Accumulation Bull</option>
            <option value="high_vol_chop">Stress Test: High-Vol Chop</option>
            <option value="drawdown">Stress Test: Distribution Drawdown</option>
          </select>
        </div>
      </div>

      <div id="guardrailAlert" class="note-box"></div>
      <div class="alloc-bar" id="allocBar"></div>
      <div class="alloc-legend mono" id="allocLegend"></div>

      <div style="overflow-x:auto;margin-bottom:14px">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Venue</th>
              <th class="num">Target Weight</th>
              <th class="num">Target USD</th>
              <th class="num">Delta USD</th>
              <th>Action</th>
              <th class="num">Est. Units</th>
              <th class="num">Slippage Cap</th>
            </tr>
          </thead>
          <tbody id="ticketBody" class="mono"></tbody>
        </table>
      </div>

      <div class="card-head" style="margin-bottom:8px">
        <span class="card-title">Non-Custodial SoDEX / ValueChain Execution-Intent JSON</span>
        <div style="display:flex;gap:8px">
          <button class="btn primary" id="btnCopyIntent">Copy SoDEX Intent JSON</button>
          <button class="btn" id="btnDownloadIntent">Download .json</button>
        </div>
      </div>
      <pre id="intentPreview">Loading execution intent...</pre>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Top Quantitative Feature Drivers (Local Gradient Attribution)</span>
          <span class="tag mono">12-Factor Model</span>
        </div>
        <table>
          <thead>
            <tr><th>Feature</th><th class="num">Raw Value</th><th class="num">Z-Score</th><th class="num">Regime Contribution</th></tr>
          </thead>
          <tbody id="driversBody" class="mono"></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-title">SoSoValue Intelligence &amp; Market Context Feed</span>
          <span class="tag mono" id="newsSourceTag">Feed</span>
        </div>
        <div id="newsFeed"></div>
      </div>
    </div>
  </section>

  <!-- TAB 2: WALK-FORWARD AUDIT -->
  <section id="tab-backtest" class="tab-panel">
    <div class="note-box" id="wfMethodNote">Loading purged walk-forward verification metrics...</div>
    <div class="grid-4 mono" id="wfSummaryCards"></div>
    <div class="card">
      <div class="card-head">
        <span class="card-title">Out-of-Sample Purged Walk-Forward Equity Curve (FlowRegime One vs BTC Buy &amp; Hold)</span>
        <span class="tag ok mono" id="wfWindowTag">--</span>
      </div>
      <div class="svg-wrap" id="equitySvgWrap" style="min-height:240px"></div>
    </div>
    <div class="card">
      <div class="card-head">
        <span class="card-title">Per-Fold Purged Expanding Walk-Forward Breakdown (10-Day Embargo, Zero Lookahead)</span>
        <span class="tag info mono">6 bps Friction</span>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Fold</th>
              <th>Train Window</th>
              <th class="num">Embargo</th>
              <th>OOS Test Window</th>
              <th class="num">FlowRegime Ret</th>
              <th class="num">BTC B&amp;H Ret</th>
              <th class="num">OOS Sharpe</th>
              <th class="num">FlowRegime MaxDD</th>
              <th class="num">BTC MaxDD</th>
            </tr>
          </thead>
          <tbody id="foldsBody" class="mono"></tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- TAB 3: METHODOLOGY & API -->
  <section id="tab-methodology" class="tab-panel">
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Quant GPU-to-Edge Pipeline Architecture</span>
          <span class="tag ok">$0 Runtime GPU Cost</span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px">
          FlowRegime One separates heavy temporal deep learning from ultra-low-latency live trading inference:
        </p>
        <ol style="padding-left:18px;font-size:13px;color:var(--text);display:grid;gap:7px">
          <li><strong>Colab A100/L4 GPU Training:</strong> Trains a PyTorch Temporal Convolutional Network + Multi-Head Self-Attention (TCN-Attn) multi-task classifier on historical OHLCV, realized vol ratios, ETF/liquidity flow Z-scores, and sentiment under strict 5-fold Purged Walk-Forward CV with a 10-day embargo gap.</li>
          <li><strong>Knowledge Distillation:</strong> Distills the TCN-Attn ensemble into a compact <code>12 &rarr; 16 (tanh) &rarr; 6</code> edge MLP exported as <code>src/model_weights.json</code>.</li>
          <li><strong>Cloudflare Worker Edge Inference:</strong> Executes deterministic matrix inference in <code>&lt;1ms</code> at $0 infrastructure cost.</li>
          <li><strong>Institutional Risk Guardrails:</strong> Fractional Kelly capped strictly at <code>&le;0.25x</code>, volatility targeting across BTC / ETH / MAG7.ssi / USDC, and a hard <code>8%</code> drawdown circuit-breaker outputting non-custodial SoDEX rebalance intents.</li>
        </ol>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-title">Verified SoSoValue OpenAPI v1 Integration</span>
          <span class="tag info mono">x-soso-api-key</span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px">
          Bind your SoSoValue API key as an encrypted Cloudflare secret (zero keys in source code):
        </p>
        <pre style="margin-bottom:10px">wrangler secret put SOSOVALUE_API_KEY
wrangler deploy</pre>
        <table class="mono" style="font-size:11.5px">
          <thead><tr><th>Module</th><th>Verified Endpoint</th></tr></thead>
          <tbody>
            <tr><td>BTC Spot ETF</td><td>GET /openapi/v1/etfs/summary-history?symbol=BTC&amp;country_code=US&amp;limit=30</td></tr>
            <tr><td>ETH Spot ETF</td><td>GET /openapi/v1/etfs/summary-history?symbol=ETH&amp;country_code=US&amp;limit=30</td></tr>
            <tr><td>SSI Index</td><td>GET /openapi/v1/indices/ssimag7/market-snapshot</td></tr>
            <tr><td>Crypto News</td><td>GET /openapi/v1/news?page=1&amp;page_size=6</td></tr>
            <tr><td>Market Overview</td><td>GET /openapi/v1/market/overview</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Live Worker REST API Endpoints</span>
        <span class="tag ok mono">JSON / CORS Enabled</span>
      </div>
      <pre id="apiCurlBox">curl -s https://upswing-flowregime.&lt;your-subdomain&gt;.workers.dev/api/v1/regime | jq .
curl -s https://upswing-flowregime.&lt;your-subdomain&gt;.workers.dev/api/v1/etf-flows | jq .
curl -s https://upswing-flowregime.&lt;your-subdomain&gt;.workers.dev/api/v1/backtest | jq .
curl -s -X POST https://upswing-flowregime.&lt;your-subdomain&gt;.workers.dev/api/v1/simulate-rebalance \
  -H "Content-Type: application/json" \
  -d '{"capital_usd":50000,"target_vol_pct":28,"current_drawdown_pct":0,"max_drawdown_stop_pct":8}' | jq .</pre>
    </div>
  </section>

  <footer>
    FlowRegime One &middot; Built by Upswing-Labs for AKINDO WaveHack Wave 3 (One-Person On-Chain Finance with SoSoValue) &middot; Non-Custodial Quantitative Decision Desk (Not Financial Advice)
  </footer>
</div>

<script>
(function () {
  const REGIME_COLORS = {
    ACCUMULATION_BULL: "#10b981",
    ETF_MOMENTUM_EXPANSION: "#38bdf8",
    HIGH_VOL_CHOP: "#f59e0b",
    DISTRIBUTION_DRAWDOWN: "#ef4444"
  };
  const ASSET_COLORS = {
    BTC: "#f59e0b",
    ETH: "#38bdf8",
    "MAG7.ssi": "#a78bfa",
    USDC: "#10b981"
  };

  let latestRegimePayload = null;
  let latestIntentJson = null;

  function fmtUsd(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
    const n = Number(v);
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return sign + "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return sign + "$" + abs.toFixed(2);
  }
  function fmtSignedPct(v) {
    const n = Number(v || 0);
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  }
  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;" }[c]));
  }

  // Tab switching
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  function renderSparkline(history) {
    const el = document.getElementById("flowSparkline");
    if (!Array.isArray(history) || history.length === 0) {
      el.innerHTML = "<div style='padding:20px;color:var(--muted);font-size:12px'>No flow bars available.</div>";
      return;
    }
    const w = 560, h = 162, padX = 12, padY = 18;
    const vals = history.map((d) => Number(d.net_inflow_usd || 0));
    const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
    const midY = h / 2;
    const barW = Math.max(4, (w - padX * 2) / vals.length - 3);
    const step = (w - padX * 2) / vals.length;

    let bars = "";
    vals.forEach((v, idx) => {
      const barH = Math.max(2, (Math.abs(v) / maxAbs) * (h / 2 - padY));
      const x = padX + idx * step;
      const y = v >= 0 ? midY - barH : midY;
      const fill = v >= 0 ? "#10b981" : "#ef4444";
      const dLabel = esc(history[idx].date || "");
      bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="2" fill="' + fill + '" opacity="0.88"><title>' + dLabel + ': ' + fmtUsd(v) + '</title></rect>';
    });
    const firstDate = esc(history[0].date || "");
    const lastDate = esc(history[history.length - 1].date || "");
    el.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="162" role="img" aria-label="30 day ETF flow bar chart">' +
      '<line x1="' + padX + '" y1="' + midY + '" x2="' + (w - padX) + '" y2="' + midY + '" stroke="#2a3d63" stroke-dasharray="3 3" />' +
      bars +
      '<text x="' + padX + '" y="13" fill="#8b9bb8" font-size="10" font-family="monospace">+' + fmtUsd(maxAbs) + '</text>' +
      '<text x="' + padX + '" y="' + (h - 4) + '" fill="#8b9bb8" font-size="10" font-family="monospace">' + firstDate + '</text>' +
      '<text x="' + (w - padX) + '" y="' + (h - 4) + '" text-anchor="end" fill="#8b9bb8" font-size="10" font-family="monospace">' + lastDate + '</text>' +
      '</svg>';
  }

  function renderAllocation(sim) {
    latestIntentJson = sim.sodex_execution_intent;
    const cb = sim.guardrails.circuit_breaker_status;
    const cbEl = document.getElementById("cbBadge");
    cbEl.textContent = "Circuit Breaker: " + cb;
    cbEl.className = "tag mono " + (cb === "CIRCUIT_BREAKER_TRIPPED" ? "danger" : cb === "PRE_STOP_TAPER" ? "warn" : "ok");

    document.getElementById("kellyBadge").textContent =
      "Frac Kelly: " + (sim.sizing_math.fractional_kelly * 100).toFixed(1) + "% (<= " + (sim.sizing_math.kelly_cap_max * 100).toFixed(0) + "%)";
    document.getElementById("volScalarBadge").textContent =
      "Vol Scalar: " + sim.sizing_math.vol_target_scalar.toFixed(2) + "x";

    const alertBox = document.getElementById("guardrailAlert");
    alertBox.className = "note-box" + (cb === "CIRCUIT_BREAKER_TRIPPED" ? " danger" : "");
    alertBox.innerHTML = "<strong>Mode: " + esc(sim.allocation_mode) + "</strong> &mdash; " +
      sim.guardrails.notes.map(esc).join(" ");

    const weights = sim.target_weights;
    const barEl = document.getElementById("allocBar");
    const legEl = document.getElementById("allocLegend");
    barEl.innerHTML = "";
    legEl.innerHTML = "";
    Object.keys(weights).forEach((asset) => {
      const pct = Number(weights[asset] || 0) * 100;
      if (pct > 0) {
        barEl.innerHTML += '<div style="width:' + pct.toFixed(2) + '%;background:' + ASSET_COLORS[asset] + '" title="' + asset + ' ' + pct.toFixed(1) + '%"></div>';
      }
      legEl.innerHTML += '<span><span class="swatch" style="background:' + ASSET_COLORS[asset] + '"></span>' + asset + ': <strong>' + pct.toFixed(1) + '%</strong></span>';
    });

    const tbody = document.getElementById("ticketBody");
    tbody.innerHTML = sim.trade_tickets.map((t) => {
      const actClass = t.action === "BUY" ? "pos" : t.action === "SELL" ? "neg" : "neu";
      return '<tr>' +
        '<td><strong>' + esc(t.asset) + '</strong></td>' +
        '<td>' + esc(t.venue) + '</td>' +
        '<td class="num">' + t.target_weight_pct.toFixed(2) + '%</td>' +
        '<td class="num">' + fmtUsd(t.target_usd) + '</td>' +
        '<td class="num ' + (t.delta_usd > 0 ? "pos" : t.delta_usd < 0 ? "neg" : "neu") + '">' + (t.delta_usd >= 0 ? "+" : "") + fmtUsd(t.delta_usd) + '</td>' +
        '<td class="' + actClass + '"><strong>' + esc(t.action) + '</strong></td>' +
        '<td class="num">' + t.estimated_units + '</td>' +
        '<td class="num">' + t.est_slippage_bps + ' bps</td>' +
      '</tr>';
    }).join("");

    document.getElementById("intentPreview").textContent = JSON.stringify(sim.sodex_execution_intent, null, 2);
  }

  async function runSimulation() {
    const capital = Number(document.getElementById("inCapital").value || 50000);
    const targetVol = Number(document.getElementById("inTargetVol").value || 28);
    const dd = Number(document.getElementById("inDrawdown").value || 0);
    const scenario = document.getElementById("inScenario").value;

    document.getElementById("capVal").textContent = fmtUsd(capital);
    document.getElementById("volVal").textContent = targetVol + "%";
    document.getElementById("ddVal").textContent = dd.toFixed(1) + "%";

    try {
      const resp = await fetch("/api/v1/simulate-rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capital_usd: capital,
          target_vol_pct: targetVol,
          current_drawdown_pct: dd,
          max_drawdown_stop_pct: 8,
          scenario: scenario
        })
      });
      const data = await resp.json();
      if (data.allocation) renderAllocation(data.allocation);
    } catch (err) {
      document.getElementById("guardrailAlert").textContent = "Simulation request failed: " + err.message;
    }
  }

  function renderRegime(data) {
    latestRegimePayload = data;
    const p = data.market.latest_prices || {};
    document.getElementById("pxBtc").textContent = fmtUsd(p.BTC);
    document.getElementById("pxEth").textContent = fmtUsd(p.ETH);
    document.getElementById("pxSsi").textContent = data.market.ssi_index?.price ? "$" + Number(data.market.ssi_index.price).toFixed(3) : "--";
    document.getElementById("pxFg").textContent = (data.market.sentiment?.fear_greed_index ?? "--") + " (" + (data.market.sentiment?.classification ?? "") + ")";

    const pill = document.getElementById("sourcePill");
    const label = document.getElementById("sourceLabel");
    label.textContent = data.data_source_label || data.data_source;
    pill.className = "pill " + (data.data_source === "sosovalue_openapi_v1" ? "live-soso" : data.data_source === "public_market_proxy_fallback" ? "proxy" : "offline");

    const inf = data.inference;
    const color = REGIME_COLORS[inf.regime] || "#10b981";
    const banner = document.getElementById("regimeBanner");
    banner.style.borderLeftColor = color;
    document.getElementById("regimeTitle").textContent = inf.regime_meta.title + " (" + inf.regime + ")";
    document.getElementById("regimeTitle").style.color = color;
    document.getElementById("regimeSummary").textContent = inf.regime_meta.summary;
    document.getElementById("regimeConf").textContent = (inf.confidence * 100).toFixed(1) + "%";
    document.getElementById("latencyBadge").textContent = "Edge Inference: " + inf.inference_latency_ms + " ms";

    const r24 = document.getElementById("kpiRet24");
    r24.textContent = fmtSignedPct(inf.forecasts.expected_return_24h_pct);
    r24.className = "val " + (inf.forecasts.expected_return_24h_pct >= 0 ? "pos" : "neg");

    const r72 = document.getElementById("kpiRet72");
    r72.textContent = fmtSignedPct(inf.forecasts.expected_return_72h_pct);
    r72.className = "val " + (inf.forecasts.expected_return_72h_pct >= 0 ? "pos" : "neg");

    document.getElementById("kpiVol72").textContent = inf.forecasts.expected_vol_72h_pct.toFixed(1) + "%";
    const dd30Pct = (data.features.drawdown_30d * 100);
    const ddEl = document.getElementById("kpiDd30");
    ddEl.textContent = dd30Pct.toFixed(1) + "%";
    ddEl.className = "val " + (dd30Pct <= -8 ? "neg" : "neu");

    const probEl = document.getElementById("probBars");
    probEl.innerHTML = Object.entries(inf.probabilities).map(([k, v]) => {
      const pct = (v * 100).toFixed(1);
      return '<div class="prob-row mono">' +
        '<span>' + esc(k) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + (REGIME_COLORS[k] || "#38bdf8") + '"></div></div>' +
        '<span style="text-align:right">' + pct + '%</span>' +
      '</div>';
    }).join("");

    // ETF Flows
    const btcFlow = data.etf_flows.btc;
    document.getElementById("etfSourceTag").textContent = data.etf_flows.is_official_sosovalue_etf
      ? (data.etf_flows.intraday_settlement_pending ? "SoSoValue ETF (T+1 Pending)" : "SoSoValue US Spot BTC ETF")
      : "Public Liquidity Flow Proxy";
    document.getElementById("flowLatest").textContent = fmtUsd(btcFlow.latest_daily_flow_usd);
    document.getElementById("flowLatest").className = "val " + (btcFlow.latest_daily_flow_usd >= 0 ? "pos" : "neg");
    document.getElementById("flow7d").textContent = fmtUsd(btcFlow.sum_7d_usd);
    document.getElementById("flow7d").className = "val " + (btcFlow.sum_7d_usd >= 0 ? "pos" : "neg");
    document.getElementById("flowZ7").textContent = (btcFlow.flow_zscore_7d >= 0 ? "+" : "") + btcFlow.flow_zscore_7d.toFixed(2) + "σ";
    document.getElementById("flowZ30").textContent = (btcFlow.flow_zscore_30d >= 0 ? "+" : "") + btcFlow.flow_zscore_30d.toFixed(2) + "σ";
    renderSparkline(btcFlow.history);
    document.getElementById("flowFootnote").textContent = data.sosovalue_api_status.note;

    // Drivers
    document.getElementById("driversBody").innerHTML = inf.top_drivers.map((d) =>
      '<tr><td>' + esc(d.feature) + '</td><td class="num">' + d.raw_value + '</td><td class="num">' + (d.z_score >= 0 ? "+" : "") + d.z_score + 'σ</td><td class="num ' + (d.contribution >= 0 ? "pos" : "neg") + '">' + (d.contribution >= 0 ? "+" : "") + d.contribution + '</td></tr>'
    ).join("");

    // News
    document.getElementById("newsSourceTag").textContent = data.data_source === "sosovalue_openapi_v1" ? "SoSoValue /news" : "Live Telemetry";
    document.getElementById("newsFeed").innerHTML = (data.news || []).map((n) =>
      '<div class="news-item"><div style="font-size:13px;font-weight:600">' + esc(n.title) + '</div><div class="news-meta mono">' + esc(n.category) + ' &middot; ' + esc(n.source) + ' &middot; ' + esc((n.published_at || "").slice(0, 16).replace("T", " ")) + ' UTC</div></div>'
    ).join("");

    renderAllocation(data.allocation);
  }

  function renderBacktest(bt) {
    const m = bt.methodology;
    const s = bt.flowregime_strategy;
    const b = bt.btc_buy_and_hold_benchmark;
    document.getElementById("wfMethodNote").innerHTML =
      "<strong>" + esc(m.validation) + ":</strong> " + m.folds + " folds &middot; " + m.embargo_days + "-day embargo gap (strictly &ge; 7d label horizon, zero lookahead leakage) &middot; " + m.transaction_cost_bps + " bps friction &middot; Max Kelly " + m.max_kelly_fraction + "x &middot; Hard Stop " + m.hard_drawdown_circuit_breaker_pct + "%.";
    document.getElementById("wfWindowTag").textContent = m.oos_window + " (" + m.oos_days + " OOS days)";

    const cards = [
      { label: "FlowRegime OOS Return", val: fmtSignedPct(s.total_return_pct), sub: "vs BTC B&H " + fmtSignedPct(b.total_return_pct), cls: s.total_return_pct >= 0 ? "pos" : "neg" },
      { label: "OOS Sharpe / Sortino", val: s.sharpe.toFixed(2) + " / " + s.sortino.toFixed(2), sub: "vs BTC " + b.sharpe.toFixed(2) + " (" + (bt.sharpe_improvement >= 0 ? "+" : "") + bt.sharpe_improvement.toFixed(2) + ")", cls: s.sharpe >= 0 ? "pos" : "neg" },
      { label: "Max Drawdown", val: "-" + s.max_drawdown_pct.toFixed(2) + "%", sub: "Reduced by " + bt.drawdown_reduction_pct.toFixed(1) + " pp vs BTC (-" + b.max_drawdown_pct.toFixed(1) + "%)", cls: "pos" },
      { label: "Calmar / Hit Rate", val: s.calmar.toFixed(2) + " / " + s.hit_rate_pct.toFixed(1) + "%", sub: "Ann Vol " + s.annualized_vol_pct.toFixed(1) + "% vs BTC " + b.annualized_vol_pct.toFixed(1) + "%", cls: "info" }
    ];
    document.getElementById("wfSummaryCards").innerHTML = cards.map((c) =>
      '<div class="card"><div class="card-title">' + esc(c.label) + '</div><div class="' + c.cls + '" style="font-size:22px;font-weight:800;margin:6px 0">' + esc(c.val) + '</div><div style="font-size:11.5px;color:var(--muted)">' + esc(c.sub) + '</div></div>'
    ).join("");

    // SVG Dual Equity Curve
    const pts = bt.equity_curve || [];
    if (pts.length >= 2) {
      const w = 960, h = 230, px = 42, py = 20;
      const allVals = pts.flatMap((p) => [p.flowregime_equity, p.btc_bh_equity]);
      const minV = Math.min(0.4, ...allVals) * 0.96;
      const maxV = Math.max(1.1, ...allVals) * 1.04;
      const toX = (i) => px + (i / (pts.length - 1)) * (w - px * 2);
      const toY = (v) => py + (1 - (v - minV) / Math.max(0.01, maxV - minV)) * (h - py * 2);

      const pathFr = pts.map((p, i) => (i === 0 ? "M" : "L") + toX(i).toFixed(1) + "," + toY(p.flowregime_equity).toFixed(1)).join(" ");
      const pathBh = pts.map((p, i) => (i === 0 ? "M" : "L") + toX(i).toFixed(1) + "," + toY(p.btc_bh_equity).toFixed(1)).join(" ");
      const yBase = toY(1.0).toFixed(1);

      document.getElementById("equitySvgWrap").innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="230">' +
        '<line x1="' + px + '" y1="' + yBase + '" x2="' + (w - px) + '" y2="' + yBase + '" stroke="#2a3d63" stroke-dasharray="4 4" />' +
        '<path d="' + pathBh + '" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.72" />' +
        '<path d="' + pathFr + '" fill="none" stroke="#10b981" stroke-width="2.8" />' +
        '<text x="' + px + '" y="14" fill="#10b981" font-size="11" font-family="monospace">&#9632; FlowRegime One (' + s.final_equity.toFixed(3) + 'x)</text>' +
        '<text x="' + (px + 230) + '" y="14" fill="#ef4444" font-size="11" font-family="monospace">&#9632; BTC Buy &amp; Hold (' + b.final_equity.toFixed(3) + 'x)</text>' +
        '<text x="6" y="' + (Number(yBase) + 3) + '" fill="#8b9bb8" font-size="10" font-family="monospace">1.00x</text>' +
        '<text x="' + px + '" y="' + (h - 4) + '" fill="#8b9bb8" font-size="10" font-family="monospace">' + esc(pts[0].date) + '</text>' +
        '<text x="' + (w - px) + '" y="' + (h - 4) + '" text-anchor="end" fill="#8b9bb8" font-size="10" font-family="monospace">' + esc(pts[pts.length - 1].date) + '</text>' +
        '</svg>';
    }

    document.getElementById("foldsBody").innerHTML = (bt.folds || []).map((f) =>
      '<tr>' +
      '<td>Fold ' + f.fold + '</td>' +
      '<td>' + esc(f.train_range) + '</td>' +
      '<td class="num">' + f.embargo_days + 'd</td>' +
      '<td>' + esc(f.test_range) + ' (' + f.test_days + 'd)</td>' +
      '<td class="num ' + (f.strategy_return_pct >= 0 ? "pos" : "neg") + '">' + fmtSignedPct(f.strategy_return_pct) + '</td>' +
      '<td class="num ' + (f.benchmark_return_pct >= 0 ? "pos" : "neg") + '">' + fmtSignedPct(f.benchmark_return_pct) + '</td>' +
      '<td class="num">' + f.strategy_sharpe.toFixed(2) + '</td>' +
      '<td class="num pos">-' + f.strategy_max_dd_pct.toFixed(2) + '%</td>' +
      '<td class="num neg">-' + f.benchmark_max_dd_pct.toFixed(2) + '%</td>' +
      '</tr>'
    ).join("");
  }

  async function loadAll() {
    try {
      const [regResp, btResp] = await Promise.all([
        fetch("/api/v1/regime"),
        fetch("/api/v1/backtest")
      ]);
      const regData = await regResp.json();
      const btData = await btResp.json();
      renderRegime(regData);
      renderBacktest(btData);
    } catch (err) {
      document.getElementById("regimeSummary").textContent = "Failed to load live desk data: " + err.message;
    }
  }

  ["inCapital", "inTargetVol", "inDrawdown", "inScenario"].forEach((id) => {
    document.getElementById(id).addEventListener("input", runSimulation);
    document.getElementById(id).addEventListener("change", runSimulation);
  });
  document.getElementById("btnRefresh").addEventListener("click", loadAll);
  document.getElementById("btnCopyIntent").addEventListener("click", async () => {
    if (!latestIntentJson) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(latestIntentJson, null, 2));
      const b = document.getElementById("btnCopyIntent");
      b.textContent = "Copied SoDEX Intent!";
      setTimeout(() => { b.textContent = "Copy SoDEX Intent JSON"; }, 1600);
    } catch {}
  });
  document.getElementById("btnDownloadIntent").addEventListener("click", () => {
    if (!latestIntentJson) return;
    const blob = new Blob([JSON.stringify(latestIntentJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowregime-sodex-intent.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Update curl examples with current origin
  try {
    const origin = window.location.origin;
    if (origin && origin.startsWith("http")) {
      document.getElementById("apiCurlBox").textContent = [
        "curl -s " + origin + "/api/v1/regime | jq .",
        "curl -s " + origin + "/api/v1/etf-flows | jq .",
        "curl -s " + origin + "/api/v1/backtest | jq .",
        "curl -s -X POST " + origin + "/api/v1/simulate-rebalance \\\\",
        "  -H " + JSON.stringify("Content-Type: application/json") + " \\\\",
        "  -d '" + JSON.stringify({ capital_usd: 50000, target_vol_pct: 28, current_drawdown_pct: 0, max_drawdown_stop_pct: 8 }) + "' | jq ."
      ].join("\\n");
    }
  } catch {}

  loadAll();
})();
</script>
</body>
</html>`;
}
