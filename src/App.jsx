import { useState, useEffect, useCallback } from "react";

const CURRENCIES = [
  { code: "USD", symbol: "$",   name: "US Dollar",        flag: "🇺🇸" },
  { code: "EUR", symbol: "€",   name: "Euro",              flag: "🇪🇺" },
  { code: "GBP", symbol: "£",   name: "British Pound",     flag: "🇬🇧" },
  { code: "ILS", symbol: "₪",   name: "Israeli Shekel",    flag: "🇮🇱" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar",   flag: "🇨🇦" },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",      flag: "🇯🇵" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso",      flag: "🇲🇽" },
  { code: "CHF", symbol: "Fr",  name: "Swiss Franc",       flag: "🇨🇭" },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",      flag: "🇮🇳" },
];

const PRESETS = [10, 12, 15, 18, 20, 25];
const TIP_COLORS = ["#FF6B9D","#FF6B35","#FFC43D","#9B5DE5","#00BBF9","#00C897"];

const PERSON_COLORS = [
  { bg: "#FF6B9D", light: "#fff0f6", text: "#fff" },
  { bg: "#9B5DE5", light: "#f3eeff", text: "#fff" },
  { bg: "#00BBF9", light: "#e8f9ff", text: "#1a1035" },
  { bg: "#FF6B35", light: "#fff3ee", text: "#fff" },
  { bg: "#00C897", light: "#e0fff7", text: "#1a1035" },
  { bg: "#FFC43D", light: "#fffbe0", text: "#1a1035" },
];

const F = "'Plus Jakarta Sans', system-ui, sans-serif";

function fmt(val, sym, code) {
  if (code === "JPY") return `${sym}${Math.round(val || 0).toLocaleString()}`;
  return `${sym}${parseFloat(val || 0).toFixed(2)}`;
}

function Lbl({ children }) {
  return <div style={{ fontFamily: F, fontSize: "12px", fontWeight: "700", color: "#9985cc", letterSpacing: "0.06em", marginBottom: "10px", textTransform: "uppercase" }}>{children}</div>;
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#ffffff", borderRadius: "24px", padding: "20px 18px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

// ─── CALCULATOR TAB ──────────────────────────────────────────────────────────
function CalculatorTab({ currency }) {
  const sym = currency.symbol;
  const code = currency.code;

  const [bill, setBill]           = useState("");
  const [tipPercent, setTipPercent] = useState(10);
  const [customTip, setCustomTip] = useState("");
  const [people, setPeople]       = useState(1);
  const [splitMode, setSplitMode] = useState("equal");
  const [shares, setShares]       = useState([{ label: "Person 1", pct: 100, fixedAmt: "", useFixed: false, fixedExcludesTip: false }]);

  const billNum   = parseFloat(bill) || 0;
  const activeTip = customTip !== "" ? (parseFloat(customTip) || 0) : tipPercent;
  const tipAmount = billNum * (activeTip / 100);
  const total     = billNum + tipAmount;

  // Sync shares length + auto-rebalance when people changes
  useEffect(() => {
    setShares(prev => {
      let next = [...prev];
      while (next.length < people) next.push({ label: `Person ${next.length + 1}`, pct: 0, fixedAmt: "", useFixed: false, fixedExcludesTip: false });
      next = next.slice(0, people);
      const freeIdxs = next.map((s, i) => (!s.useFixed ? i : -1)).filter(x => x >= 0);
      if (freeIdxs.length > 0) {
        const eq = parseFloat((100 / freeIdxs.length).toFixed(4));
        const pcts = Array(freeIdxs.length).fill(eq);
        const sum = pcts.slice(0, -1).reduce((a, b) => a + b, 0);
        pcts[pcts.length - 1] = parseFloat((100 - sum).toFixed(4));
        let fi = 0;
        next = next.map(s => s.useFixed ? s : { ...s, pct: pcts[fi++] });
      }
      return next;
    });
  }, [people]);

  // Resolve each person's final dollar amount using cent-fair distribution
  const resolvedShares = (() => {
    if (total <= 0) return shares.map(() => ({ amt: 0, billAmt: 0, tipAmt: 0, pct: 0 }));
    const isJPY   = code === "JPY";
    const unit    = isJPY ? 1 : 0.01;
    const tipRate = billNum > 0 ? tipAmount / billNum : 0;

    // Fixed people get their exact amounts
    const fixedTotals = shares.map(s => {
      if (!s.useFixed) return 0;
      const raw = parseFloat(s.fixedAmt) || 0;
      return s.fixedExcludesTip ? raw * (1 + tipRate) : raw;
    });
    const fixedSum  = fixedTotals.reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, total - fixedSum);

    // Free people: proportional amounts snapped to cents, remainder distributed by largest-fraction
    const freeIdxs   = shares.map((s, i) => (!s.useFixed ? i : -1)).filter(x => x >= 0);
    const freePctSum  = freeIdxs.reduce((s, i) => s + (parseFloat(shares[i].pct) || 0), 0);
    const freeRawAmts = freeIdxs.map(i => {
      const pct    = parseFloat(shares[i].pct) || 0;
      const norm   = freePctSum > 0 ? pct / freePctSum : (freeIdxs.length > 0 ? 1 / freeIdxs.length : 0);
      return remaining * norm;
    });
    const remUnits  = Math.round(remaining / unit);
    const floored   = freeRawAmts.map(a => Math.floor(Math.round(a / unit * 1e6) / 1e6));
    const leftover  = remUnits - floored.reduce((a, b) => a + b, 0);
    const fracs     = freeRawAmts.map((a, j) => ({ j, frac: (a / unit) - floored[j] }));
    fracs.sort((a, b) => b.frac - a.frac);
    const finalU    = [...floored];
    for (let k = 0; k < leftover && k < fracs.length; k++) finalU[fracs[k].j]++;
    const freeAmts  = {};
    freeIdxs.forEach((si, k) => { freeAmts[si] = finalU[k] * unit; });

    return shares.map((s, i) => {
      if (s.useFixed) {
        const amt     = fixedTotals[i];
        const billAmt = s.fixedExcludesTip ? (parseFloat(s.fixedAmt) || 0) : (tipRate > 0 ? amt / (1 + tipRate) : amt);
        return { amt, billAmt, tipAmt: amt - billAmt, pct: total > 0 ? (amt / total) * 100 : 0 };
      }
      const amt     = freeAmts[i] || 0;
      const billAmt = total > 0 ? (amt / total) * billNum : 0;
      return { amt, billAmt, tipAmt: amt - billAmt, pct: total > 0 ? (amt / total) * 100 : 0 };
    });
  })();

  const fixedTotalSum = resolvedShares.filter((_, i) => shares[i].useFixed).reduce((s, x) => s + x.amt, 0);
  const overBudget    = fixedTotalSum > total + 0.01;
  const totalResolved = resolvedShares.reduce((s, x) => s + x.amt, 0);
  const shareValid    = !overBudget && Math.abs(totalResolved - total) < 0.5;

  const updatePct = (i, val) => {
    setShares(prev => {
      const newVal = parseFloat(val);
      if (isNaN(newVal)) return prev;
      const oldVal = parseFloat(prev[i].pct) || 0;
      const diff   = oldVal - newVal;
      const freeIdxs = prev.map((s, idx) => (!s.useFixed ? idx : -1)).filter(x => x >= 0);
      const myPos    = freeIdxs.indexOf(i);
      if (myPos === -1) return prev;
      const neighborPos = myPos < freeIdxs.length - 1 ? myPos + 1 : 0;
      const neighborIdx = freeIdxs[neighborPos];
      if (neighborIdx === i) return prev.map((s, idx) => idx === i ? { ...s, pct: parseFloat(newVal.toFixed(4)) } : s);
      const neighborNew = parseFloat(((parseFloat(prev[neighborIdx].pct) || 0) + diff).toFixed(4));
      return prev.map((s, idx) => {
        if (idx === i)          return { ...s, pct: parseFloat(newVal.toFixed(4)) };
        if (idx === neighborIdx) return { ...s, pct: neighborNew };
        return s;
      });
    });
  };

  const rebalanceFree = arr => {
    const freeIdxs = arr.map((s, i) => (!s.useFixed ? i : -1)).filter(x => x >= 0);
    if (freeIdxs.length === 0) return arr;
    // Use 4dp so 1/3 = 33.3333 — cent-fair resolver handles actual rounding
    const eq   = parseFloat((100 / freeIdxs.length).toFixed(4));
    const pcts = Array(freeIdxs.length).fill(eq);
    const sum  = pcts.slice(0, -1).reduce((a, b) => a + b, 0);
    pcts[pcts.length - 1] = parseFloat((100 - sum).toFixed(4));
    let fi = 0;
    return arr.map(s => s.useFixed ? s : { ...s, pct: pcts[fi++] });
  };

  const toggleFixed = i => {
    setShares(prev => rebalanceFree(prev.map((s, idx) => idx === i ? { ...s, useFixed: !s.useFixed, fixedAmt: "", fixedExcludesTip: false } : s)));
  };

  const toggleFixedExcludesTip = i => {
    setShares(prev => prev.map((s, idx) => idx === i ? { ...s, fixedExcludesTip: !s.fixedExcludesTip } : s));
  };

  const autoBalance = () => setShares(prev => rebalanceFree(prev));

  const pc = i => PERSON_COLORS[i % PERSON_COLORS.length];

  // Fair cent-based equal split
  const equalSplit = (() => {
    if (people < 2 || total <= 0) return null;
    const isJPY  = code === "JPY";
    const unit   = isJPY ? 1 : 0.01;
    const tUnits = Math.round(total   / unit);
    const bUnits = Math.round(billNum / unit);
    const tipU   = Math.round(tipAmount / unit);
    const baseT  = Math.floor(tUnits / people);
    const baseB  = Math.floor(bUnits / people);
    const baseTip = Math.floor(tipU   / people);
    const extraT  = tUnits - baseT   * people;
    const extraB  = bUnits - baseB   * people;
    const extraTip = tipU  - baseTip * people;
    return shares.map((_, i) => ({
      total: (baseT   + (i < extraT   ? 1 : 0)) * unit,
      bill:  (baseB   + (i < extraB   ? 1 : 0)) * unit,
      tip:   (baseTip + (i < extraTip ? 1 : 0)) * unit,
    }));
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Bill amount */}
      <Card>
        <Lbl>💵 Bill Amount</Lbl>
        <div style={{ display: "flex", alignItems: "center", background: "#f3effb", borderRadius: "16px", border: "2px solid #e8e0f5", padding: "13px 16px", gap: "8px" }}>
          <span style={{ fontFamily: F, fontSize: "22px", color: "#9B5DE5", fontWeight: "800" }}>{sym}</span>
          <input
            type="number" placeholder="0.00" value={bill} onChange={e => setBill(e.target.value)}
            style={{ border: "none", background: "transparent", fontFamily: F, fontSize: "24px", fontWeight: "700", color: "#1a1035", outline: "none", width: "100%" }}
          />
        </div>
      </Card>

      {/* Tip */}
      <Card>
        <Lbl>🎉 Tip Percentage</Lbl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "10px" }}>
          {PRESETS.map((p, pidx) => {
            const active = tipPercent === p && customTip === "";
            const col    = TIP_COLORS[pidx];
            return (
              <button key={p} onClick={() => { setTipPercent(p); setCustomTip(""); }} style={{
                padding: "10px 0", borderRadius: "12px", flex: "1 1 14%",
                border: `2px solid ${active ? col : "#e8e0f5"}`,
                background: active ? col : "#f3effb",
                color: active ? "#fff" : "#1a1035",
                fontFamily: F, fontSize: "13px", fontWeight: "800", cursor: "pointer",
                boxShadow: active ? `0 4px 12px ${col}60` : "none",
                transition: "all 0.15s",
              }}>{p}%</button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", background: "#f3effb", borderRadius: "16px", border: `2px solid ${customTip !== "" ? "#9B5DE5" : "#e8e0f5"}`, padding: "13px 16px", gap: "8px", boxShadow: customTip !== "" ? "0 0 0 4px #9B5DE518" : "none" }}>
          <input
            type="number" placeholder="Custom %" value={customTip}
            onChange={e => { setCustomTip(e.target.value); if (e.target.value !== "") setTipPercent(null); }}
            style={{ border: "none", background: "transparent", fontFamily: F, fontSize: "18px", fontWeight: "700", color: "#1a1035", outline: "none", width: "100%" }}
          />
          <span style={{ fontFamily: F, fontSize: "15px", color: "#9985cc", fontWeight: "600" }}>%</span>
        </div>
        {billNum > 0 && (
          <div style={{ fontFamily: F, fontSize: "12px", color: "#9985cc", marginTop: "8px", textAlign: "right", fontWeight: "600" }}>
            Tip: {fmt(tipAmount, sym, code)}
          </div>
        )}
      </Card>

      {/* Split */}
      <Card>
        <Lbl>👥 Split Between</Lbl>
        <div style={{ display: "flex", alignItems: "center", background: "#f3effb", borderRadius: "14px", border: "2px solid #e8e0f5", overflow: "hidden", marginBottom: "14px" }}>
          <button onClick={() => setPeople(Math.max(1, people - 1))} style={{
            background: "none", border: "none", padding: "13px 20px", fontSize: "24px",
            color: people === 1 ? "#e8e0f5" : "#FF6B9D", cursor: people === 1 ? "not-allowed" : "pointer", fontWeight: "900",
          }}>−</button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: F, fontSize: "17px", fontWeight: "700", color: "#1a1035" }}>
            {people} {people === 1 ? "person" : "people"}
          </div>
          <button onClick={() => setPeople(Math.min(12, people + 1))} style={{
            background: "none", border: "none", padding: "13px 20px", fontSize: "24px",
            color: "#9B5DE5", cursor: "pointer", fontWeight: "900",
          }}>+</button>
        </div>

        {people > 1 && (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", background: "#f3effb", borderRadius: "14px", overflow: "hidden", marginBottom: "14px", padding: "4px", gap: "4px" }}>
              {[["equal","⚖️ Equal Split"],["percent","✏️ Custom Split"]].map(([m, label]) => (
                <button key={m} onClick={() => { setSplitMode(m); if (m === "equal") autoBalance(); }} style={{
                  flex: 1, padding: "10px", border: "none", borderRadius: "10px",
                  background: splitMode === m ? "linear-gradient(135deg, #FF6B9D, #9B5DE5)" : "transparent",
                  color: splitMode === m ? "#fff" : "#9985cc",
                  fontFamily: F, fontSize: "13px", fontWeight: "700", cursor: "pointer",
                  boxShadow: splitMode === m ? "0 3px 12px rgba(155,93,229,0.35)" : "none",
                  transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>

            {/* Custom split rows */}
            {splitMode === "percent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {shares.map((s, i) => {
                  const col = pc(i);
                  return (
                    <div key={i} style={{ background: s.useFixed ? col.light : "#f3effb", borderRadius: "16px", border: `2px solid ${s.useFixed ? col.bg : "#e8e0f5"}`, padding: "12px 14px" }}>
                      {/* Name + mode toggle */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <input
                          value={s.label}
                          onChange={e => setShares(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "2px solid #e8e0f5", background: "#fff", fontFamily: F, fontSize: "13px", fontWeight: "600", color: "#1a1035", outline: "none" }}
                        />
                        {/* % / $ pill */}
                        <div style={{ display: "flex", background: "#fff", borderRadius: "8px", border: "2px solid #e8e0f5", overflow: "hidden", flexShrink: 0 }}>
                          <button onClick={() => s.useFixed && toggleFixed(i)} style={{
                            padding: "6px 12px", border: "none",
                            background: !s.useFixed ? col.bg : "transparent",
                            color: !s.useFixed ? "#fff" : "#9985cc",
                            fontFamily: F, fontSize: "11px", fontWeight: "800", cursor: s.useFixed ? "pointer" : "default",
                          }}>%</button>
                          <button onClick={() => !s.useFixed && toggleFixed(i)} style={{
                            padding: "6px 12px", border: "none",
                            background: s.useFixed ? col.bg : "transparent",
                            color: s.useFixed ? "#fff" : "#9985cc",
                            fontFamily: F, fontSize: "11px", fontWeight: "800", cursor: !s.useFixed ? "pointer" : "default",
                          }}>{sym}</button>
                        </div>
                      </div>

                      {/* Value row */}
                      {s.useFixed ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: F, fontSize: "20px", color: col.bg, fontWeight: "800" }}>{sym}</span>
                            <input
                              type="number" value={s.fixedAmt} placeholder="Enter amount…"
                              onChange={e => setShares(prev => prev.map((x, idx) => idx === i ? { ...x, fixedAmt: e.target.value } : x))}
                              style={{ flex: 1, border: "none", background: "transparent", fontFamily: F, fontSize: "18px", fontWeight: "700", color: "#1a1035", outline: "none" }}
                            />
                            <span style={{ fontFamily: F, fontSize: "10px", color: "#fff", fontWeight: "800", background: col.bg, padding: "3px 7px", borderRadius: "6px" }}>FIXED</span>
                          </div>
                          {/* Tip include/exclude toggle */}
                          <div style={{ display: "flex", background: "#fff", borderRadius: "8px", border: "1px solid #e8e0f5", overflow: "hidden" }}>
                            <button onClick={() => s.fixedExcludesTip && toggleFixedExcludesTip(i)} style={{
                              flex: 1, padding: "7px 8px", border: "none",
                              background: !s.fixedExcludesTip ? col.bg : "transparent",
                              color: !s.fixedExcludesTip ? "#fff" : "#9985cc",
                              fontFamily: F, fontSize: "10px", fontWeight: "700", cursor: s.fixedExcludesTip ? "pointer" : "default",
                            }}>TOTAL INCL. TIP</button>
                            <button onClick={() => !s.fixedExcludesTip && toggleFixedExcludesTip(i)} style={{
                              flex: 1, padding: "7px 8px", border: "none",
                              background: s.fixedExcludesTip ? col.bg : "transparent",
                              color: s.fixedExcludesTip ? "#fff" : "#9985cc",
                              fontFamily: F, fontSize: "10px", fontWeight: "700", cursor: !s.fixedExcludesTip ? "pointer" : "default",
                            }}>BILL ONLY + TIP</button>
                          </div>
                          {s.fixedAmt && parseFloat(s.fixedAmt) > 0 && (
                            <div style={{ fontFamily: F, fontSize: "11px", color: col.bg, fontWeight: "600" }}>
                              {s.fixedExcludesTip ? `Pays ${sym}${parseFloat(s.fixedAmt).toFixed(2)} bill + tip on top` : `Pays ${sym}${parseFloat(s.fixedAmt).toFixed(2)} total (tip included)`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontFamily: F, fontSize: "20px", color: "#9985cc", fontWeight: "700" }}>{sym}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: F, fontSize: "18px", fontWeight: "700", color: "#1a1035" }}>
                              {total > 0 ? fmt(resolvedShares[i] ? resolvedShares[i].amt : 0, sym, code).replace(sym, "") : "—"}
                            </div>
                            <div style={{ fontFamily: F, fontSize: "10px", color: "#9985cc", marginTop: "1px", fontWeight: "600" }}>
                              {(() => {
                                const anyFixed = shares.some(x => x.useFixed);
                                const remainder = Math.max(0, total - fixedTotalSum);
                                if (anyFixed && remainder > 0 && resolvedShares[i]) {
                                  return `${(resolvedShares[i].amt / remainder * 100).toFixed(1)}% of remainder`;
                                }
                                return `${parseFloat(s.pct).toFixed(1)}% of total`;
                              })()}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <button onClick={() => updatePct(i, Math.max(0, parseFloat(s.pct || 0) + 1).toString())} style={{ background: "none", border: "1px solid #e8e0f5", borderRadius: "5px", width: "26px", height: "24px", cursor: "pointer", color: "#9985cc", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                            <button onClick={() => updatePct(i, Math.max(0, parseFloat(s.pct || 0) - 1).toString())} style={{ background: "none", border: "1px solid #e8e0f5", borderRadius: "5px", width: "26px", height: "24px", cursor: "pointer", color: "#9985cc", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                  <span style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", color: overBudget ? "#ff4d6d" : "#00C897" }}>
                    {overBudget ? "⚠ Fixed amounts exceed total" : shareValid ? `✓ ${fmt(totalResolved, sym, code)} allocated` : "Calculating…"}
                  </span>
                  <button onClick={autoBalance} style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", color: "#9B5DE5", background: "none", border: "1.5px solid #9B5DE5", borderRadius: "8px", padding: "5px 12px", cursor: "pointer" }}>✨ Auto-balance</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Results ── */}
      {billNum > 0 && (
        <>
          {(splitMode === "equal" || people === 1) ? (
            <>
              {/* Hero card */}
              <div style={{ background: "linear-gradient(135deg, #FF6B9D 0%, #9B5DE5 100%)", borderRadius: "24px", padding: "26px", boxShadow: "0 8px 32px rgba(155,93,229,0.5)", color: "#fff" }}>
                <div style={{ fontFamily: F, fontSize: "11px", opacity: 0.85, letterSpacing: "0.1em", marginBottom: "8px", fontWeight: "700" }}>
                  {people > 1 ? "EACH PERSON PAYS" : "TOTAL WITH TIP"}
                </div>
                <div style={{ fontFamily: F, fontSize: "52px", fontWeight: "900", lineHeight: 1, letterSpacing: "-1px" }}>
                  {fmt(people > 1 ? (equalSplit ? equalSplit[0].total : total / people) : total, sym, code)}
                </div>
                {people > 1 && equalSplit && (
                  <div style={{ fontFamily: F, fontSize: "13px", opacity: 0.8, marginTop: "10px", display: "flex", gap: "16px", fontWeight: "600" }}>
                    <span>bill {fmt(equalSplit[0].bill, sym, code)}</span>
                    <span>+ tip {fmt(equalSplit[0].tip, sym, code)}</span>
                  </div>
                )}
              </div>

              {/* Per-person rows */}
              {people > 1 && equalSplit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", color: "#9985cc", letterSpacing: "0.06em", paddingLeft: "4px" }}>BREAKDOWN PER PERSON</div>
                  {shares.map((s, i) => (
                    <div key={i} style={{ background: pc(i).light, borderRadius: "18px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${pc(i).bg}` }}>
                      <div style={{ fontFamily: F, fontSize: "14px", fontWeight: "700", color: pc(i).bg }}>{s.label}</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: F, fontSize: "20px", fontWeight: "800", color: "#1a1035" }}>{fmt(equalSplit[i].total, sym, code)}</div>
                        <div style={{ fontFamily: F, fontSize: "10px", color: "#9985cc", marginTop: "2px", fontWeight: "600" }}>
                          {fmt(equalSplit[i].bill, sym, code)} bill + {fmt(equalSplit[i].tip, sym, code)} tip
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            shareValid && !overBudget && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", color: "#9985cc", letterSpacing: "0.06em", paddingLeft: "4px" }}>EACH PERSON PAYS</div>
                {resolvedShares.map((r, i) => {
                  const s   = shares[i];
                  const col = pc(i);
                  return (
                    <div key={i} style={{ background: col.bg, color: col.text, borderRadius: "18px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 6px 20px ${col.bg}60` }}>
                      <div>
                        <div style={{ fontFamily: F, fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          {s.label}
                          {s.useFixed && <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "5px", background: "rgba(255,255,255,0.25)", fontWeight: "800" }}>FIXED</span>}
                        </div>
                        <div style={{ fontFamily: F, fontSize: "11px", opacity: 0.8, marginTop: "4px", fontWeight: "600" }}>
                          {fmt(r.billAmt, sym, code)} bill + {fmt(r.tipAmt, sym, code)} tip
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: F, fontSize: "26px", fontWeight: "900" }}>{fmt(r.amt, sym, code)}</div>
                        <div style={{ fontFamily: F, fontSize: "10px", opacity: 0.75, marginTop: "2px", fontWeight: "700" }}>
                          {(() => {
                            const anyFixed  = shares.some(x => x.useFixed);
                            const remainder = Math.max(0, total - fixedTotalSum);
                            if (!s.useFixed && anyFixed && remainder > 0) {
                              return `${(r.amt / remainder * 100).toFixed(1)}% of remainder`;
                            }
                            return `${r.pct.toFixed(1)}% of total`;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Summary row */}
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, borderRadius: "20px", padding: "16px", background: "linear-gradient(135deg, #FEE440, #FF6B35)", color: "#fff", boxShadow: "0 4px 16px rgba(255,107,53,0.35)" }}>
              <div style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", opacity: 0.85, marginBottom: "6px" }}>🎉 Tip</div>
              <div style={{ fontFamily: F, fontSize: "22px", fontWeight: "900" }}>{fmt(tipAmount, sym, code)}</div>
              <div style={{ fontFamily: F, fontSize: "11px", opacity: 0.8, marginTop: "2px", fontWeight: "600" }}>{activeTip}%</div>
            </div>
            <div style={{ flex: 1, borderRadius: "20px", padding: "16px", background: "linear-gradient(135deg, #00BBF9, #9B5DE5)", color: "#fff", boxShadow: "0 4px 16px rgba(0,187,249,0.35)" }}>
              <div style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", opacity: 0.85, marginBottom: "6px" }}>💳 Total</div>
              <div style={{ fontFamily: F, fontSize: "22px", fontWeight: "900" }}>{fmt(total, sym, code)}</div>
              <div style={{ fontFamily: F, fontSize: "11px", opacity: 0.8, marginTop: "2px", fontWeight: "600" }}>incl. tip</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CURRENCY TAB ─────────────────────────────────────────────────────────────
function CurrencyTab() {
  const [rates, setRates]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [amount, setAmount]         = useState("100");
  const [from, setFrom]             = useState("USD");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targets = CURRENCIES.filter(c => c.code !== from).map(c => c.code).join(",");
      const res  = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${targets}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRates(data.rates);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Could not fetch live rates. Showing approximate values.");
      const fallback = { USD:1, EUR:0.92, GBP:0.79, ILS:3.7, CAD:1.36, AUD:1.53, JPY:149, MXN:17.2, CHF:0.89, INR:83.2 };
      const base = fallback[from] || 1;
      const r = {};
      CURRENCIES.filter(c => c.code !== from).forEach(c => { r[c.code] = parseFloat((fallback[c.code] / base).toFixed(4)); });
      setRates(r);
    }
    setLoading(false);
  }, [from]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const amountNum = parseFloat(amount) || 0;
  const fromCur   = CURRENCIES.find(c => c.code === from);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Card>
        <Lbl>💱 Amount to Convert</Lbl>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#f3effb", borderRadius: "16px", border: "2px solid #e8e0f5", padding: "13px 16px", gap: "8px", flex: 2 }}>
            <span style={{ fontFamily: F, fontSize: "20px", color: "#9B5DE5", fontWeight: "800" }}>{fromCur ? fromCur.symbol : "$"}</span>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ border: "none", background: "transparent", fontFamily: F, fontSize: "22px", fontWeight: "700", color: "#1a1035", outline: "none", width: "100%" }}
            />
          </div>
          <select value={from} onChange={e => setFrom(e.target.value)} style={{ flex: 1, padding: "13px 10px", borderRadius: "16px", border: "2px solid #e8e0f5", background: "#f3effb", fontFamily: F, fontSize: "13px", fontWeight: "700", color: "#1a1035", outline: "none", cursor: "pointer" }}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
        </div>
      </Card>

      {loading && <div style={{ textAlign: "center", fontFamily: F, fontSize: "13px", color: "#9985cc", padding: "20px", fontWeight: "600" }}>Fetching live rates… ✨</div>}

      {error && <div style={{ fontFamily: F, fontSize: "11px", fontWeight: "700", color: "#FF6B35", background: "#fff3ee", borderRadius: "12px", padding: "10px 14px" }}>⚠ {error}</div>}

      {rates && !loading && (
        <>
          <div style={{ fontFamily: F, fontSize: "10px", fontWeight: "700", color: "#9985cc", textAlign: "right", letterSpacing: "0.06em" }}>
            LIVE RATES · {lastUpdated}
            <button onClick={fetchRates} style={{ marginLeft: "8px", background: "none", border: "none", color: "#9B5DE5", cursor: "pointer", fontSize: "13px", fontFamily: F, fontWeight: "800" }}>↻</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {CURRENCIES.filter(c => c.code !== from).map((c, i) => {
              const rate      = rates[c.code] || 0;
              const converted = amountNum * rate;
              const isTop     = i === 0;
              return (
                <div key={c.code} onClick={() => setFrom(c.code)} style={{
                  background: isTop ? "linear-gradient(135deg, #FF6B9D, #9B5DE5)" : "#ffffff",
                  color: isTop ? "#fff" : "#1a1035",
                  borderRadius: "18px", padding: "16px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  boxShadow: isTop ? "0 8px 24px rgba(155,93,229,0.45)" : "0 2px 12px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontFamily: F, fontSize: "15px", fontWeight: "700" }}>{c.flag} {c.code}</div>
                    <div style={{ fontFamily: F, fontSize: "11px", opacity: 0.65, marginTop: "2px", fontWeight: "600" }}>
                      {c.name} · 1 {from} = {rate.toFixed(4)} {c.code}
                    </div>
                  </div>
                  <div style={{ fontFamily: F, fontSize: "22px", fontWeight: "900" }}>
                    {c.code === "JPY" ? `${c.symbol}${Math.round(converted).toLocaleString()}` : `${c.symbol}${converted.toFixed(2)}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: F, fontSize: "10px", fontWeight: "600", color: "#9985cc", textAlign: "center", marginTop: "4px" }}>
            Tap any currency to convert from it · Powered by Frankfurter API
          </div>
        </>
      )}
    </div>
  );
}

// ─── INSTALL BUTTON ───────────────────────────────────────────────────────────
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showTooltip, setShowTooltip]       = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-installed")) { setInstalled(true); return; }
    const handler = e => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); localStorage.setItem("pwa-installed", "1"); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") { setInstalled(true); localStorage.setItem("pwa-installed", "1"); }
      setDeferredPrompt(null);
    } else {
      setShowTooltip(t => !t);
    }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={handleClick} style={{
        background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)",
        borderRadius: "20px", padding: "6px 14px", cursor: "pointer",
        fontFamily: F, fontSize: "12px", fontWeight: "700", color: "#ffffff",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        📲 Add to Home Screen
      </button>
      {showTooltip && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#2d1b69", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "12px",
          padding: "10px 14px", width: "220px", zIndex: 100,
          fontFamily: F, fontSize: "12px", color: "#ffffff", fontWeight: "500", lineHeight: 1.5,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {isIOS
            ? "Tap the Share button (□↑) in Safari, then tap \"Add to Home Screen\""
            : "Tap your browser menu (⋮) and select \"Add to Home Screen\""}
          <button onClick={() => setShowTooltip(false)} style={{
            display: "block", marginTop: "8px", background: "none", border: "none",
            color: "#FF6B9D", fontFamily: F, fontSize: "11px", fontWeight: "700", cursor: "pointer", padding: 0,
          }}>Got it ✕</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                         = useState(0);
  const [currency, setCurrency]               = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #1a1035 0%, #2d1b69 50%, #1a1035 100%)", fontFamily: F, padding: "28px 16px 56px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        * { box-sizing: border-box; }
        select { appearance: none; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation: float 3s ease-in-out infinite; display: inline-block; }
      `}</style>

      <div style={{ position: "fixed", top: "-80px", right: "-80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,93,229,0.25), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-60px", left: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,157,0.18), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div className="float" style={{ fontSize: "48px", marginBottom: "6px" }}>🍽️</div>
          <div style={{ fontFamily: F, fontSize: "40px", fontWeight: "900", color: "#ffffff", lineHeight: 1, letterSpacing: "-1px" }}>
            Bon<span style={{ background: "linear-gradient(90deg, #FF6B9D, #9B5DE5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Tip</span>
          </div>
          <div style={{ fontFamily: F, fontSize: "13px", color: "#9985cc", marginTop: "6px", fontWeight: "600" }}>
            split it. tip it. done ✨
          </div>
          <div style={{ marginTop: "12px" }}>
            <InstallButton />
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: "20px", padding: "5px", marginBottom: "16px", border: "1.5px solid rgba(255,255,255,0.12)" }}>
          {["🧮 Split", "💱 Convert"].map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex: 1, padding: "11px", border: "none", borderRadius: "15px",
              background: tab === i ? "linear-gradient(135deg, #FF6B9D, #9B5DE5)" : "transparent",
              color: tab === i ? "#fff" : "#9985cc",
              fontFamily: F, fontSize: "14px", fontWeight: "700", cursor: "pointer",
              boxShadow: tab === i ? "0 4px 15px rgba(155,93,229,0.4)" : "none",
              transition: "all 0.2s",
            }}>{t}</button>
          ))}
        </div>

        {/* Currency picker */}
        {tab === 0 && (
          <div style={{ marginBottom: "14px" }}>
            <button onClick={() => setShowCurrencyPicker(!showCurrencyPicker)} style={{
              width: "100%", background: "rgba(255,255,255,0.07)", border: `1.5px solid ${showCurrencyPicker ? "#FF6B9D" : "rgba(255,255,255,0.15)"}`,
              borderRadius: "16px", padding: "12px 18px", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: F, fontSize: "12px", color: "#9985cc", fontWeight: "700", letterSpacing: "0.06em" }}>💰 CURRENCY</span>
              <span style={{ fontFamily: F, fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                {currency.flag} {currency.code} ({currency.symbol}) {showCurrencyPicker ? "▲" : "▼"}
              </span>
            </button>
            {showCurrencyPicker && (
              <div style={{ background: "rgba(26,16,53,0.97)", borderRadius: "18px", marginTop: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.12)" }}>
                {CURRENCIES.map(c => (
                  <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }} style={{
                    width: "100%", padding: "13px 18px", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: c.code === currency.code ? "rgba(155,93,229,0.2)" : "transparent",
                    display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
                  }}>
                    <span style={{ fontFamily: F, fontSize: "14px", color: "#ffffff", fontWeight: "500" }}>{c.flag} {c.name}</span>
                    <span style={{ fontFamily: F, fontSize: "13px", fontWeight: "700", color: c.code === currency.code ? "#FF6B9D" : "#9985cc" }}>{c.symbol} {c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 0 ? <CalculatorTab currency={currency} /> : <CurrencyTab />}

        <div style={{ textAlign: "center", marginTop: "36px", fontFamily: F, fontSize: "12px", color: "#5a4a7a", fontWeight: "600" }}>
          made with 💜 · BonTip — free forever
          <div style={{ marginTop: "6px", fontSize: "11px", color: "#7a6a9a", fontWeight: "400" }}>Results are estimates for convenience only. Always verify your bill.</div>
        </div>
      </div>
    </div>
  );
}
