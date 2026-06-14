import { useState, useEffect, useCallback } from "react";

const PALETTE = {
  bg: "#0a0a0f", surface: "#111118", border: "#1e1e2e",
  accent: "#7c3aed", accentGlow: "#a855f7",
  green: "#22c55e", red: "#ef4444", text: "#e2e8f0", muted: "#64748b",
};

const formatUSD = (n) => {
  if (n == null) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${Number(n).toFixed(0)}`;
};

const shortAddr = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "—";

async function hlFetch(body) {
  const r = await fetch("/api/hl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("API error");
  return r.json();
}

const PnlBadge = ({ value }) => (
  <span style={{ color: value >= 0 ? PALETTE.green : PALETTE.red, fontWeight: 700, fontSize: 13 }}>
    {value >= 0 ? "+" : ""}{formatUSD(value)}
  </span>
);

const SideBadge = ({ side }) => (
  <span style={{
    background: side === "long" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
    color: side === "long" ? PALETTE.green : PALETTE.red,
    border: `1px solid ${side === "long" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
    borderRadius: 4, padding: "2px 7px",
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  }}>{side}</span>
);

const ConsensusPanel = ({ traders }) => {
  const map = {};
  traders.forEach(t => (t.positions||[]).forEach(p => {
    if (!map[p.coin]) map[p.coin] = { long:0, short:0 };
    map[p.coin][p.side]++;
  }));
  const sorted = Object.entries(map)
    .map(([coin,v]) => ({ coin, ...v, total: v.long+v.short }))
    .sort((a,b) => b.total-a.total).slice(0,10);
  if (!sorted.length) return null;
  return (
    <div style={{ background:PALETTE.surface, border:`1px solid ${PALETTE.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
      <div style={{ color:PALETTE.muted, fontSize:10, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
        🔥 Консенсус — найпопулярніші монети
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
        {sorted.map(c => (
          <div key={c.coin} style={{
            background:PALETTE.bg,
            border:`1px solid ${c.long>=c.short?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,
            borderRadius:8, padding:"7px 11px",
          }}>
            <div style={{ color:PALETTE.text, fontWeight:700, fontSize:13 }}>{c.coin}</div>
            <div style={{ display:"flex", gap:6, fontSize:11, marginTop:3 }}>
              <span style={{ color:PALETTE.green }}>▲{c.long}</span>
              <span style={{ color:PALETTE.red }}>▼{c.short}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TraderCard = ({ trader, rank }) => {
  const [open, setOpen] = useState(false);
  const rankColors = ["#f59e0b","#94a3b8","#cd7f32"];
  return (
    <div onClick={() => setOpen(o=>!o)} style={{
      background:PALETTE.surface,
      border:`1px solid ${open?PALETTE.accent:PALETTE.border}`,
      borderRadius:12, overflow:"hidden", cursor:"pointer",
      transition:"border-color 0.2s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background: rank<=3
            ? `linear-gradient(135deg,${rankColors[rank-1]},#1a1a2e)`
            : `linear-gradient(135deg,${PALETTE.accent},#1a1a2e)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:800, fontSize:10, color:"#fff",
        }}>{rank}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:PALETTE.text, fontWeight:600, fontSize:11, fontFamily:"monospace" }}>
            {shortAddr(trader.ethAddress)}
          </div>
          <div style={{ color:PALETTE.muted, fontSize:10, marginTop:1 }}>
            {trader.positions?.length
              ? `${trader.positions.length} позицій`
              : trader.positionsLoaded ? "нема позицій" : "завантажую…"}
          </div>
        </div>
        <div style={{ textAlign:"right", marginRight:6 }}>
          <div style={{ fontSize:10, color:PALETTE.muted }}>PnL</div>
          <PnlBadge value={trader.pnl} />
        </div>
        <span style={{
          color:open?PALETTE.accentGlow:PALETTE.muted, fontSize:13,
          transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", display:"block", flexShrink:0,
        }}>▾</span>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${PALETTE.border}` }}>
          {!trader.positionsLoaded ? (
            <div style={{ padding:"14px 16px", color:PALETTE.muted, fontSize:12 }}>↻ завантажую позиції…</div>
          ) : !trader.positions?.length ? (
            <div style={{ padding:"14px 16px", color:PALETTE.muted, fontSize:12 }}>Немає відкритих позицій</div>
          ) : (
            <>
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 65px 75px 80px 80px",
                padding:"7px 14px", color:PALETTE.muted, fontSize:9,
                letterSpacing:1, textTransform:"uppercase",
                borderBottom:`1px solid ${PALETTE.border}`,
              }}>
                <span>Монета</span><span>Сайд</span><span>Розмір</span><span>Вхід</span><span>PnL</span>
              </div>
              {trader.positions.map((p,i) => (
                <div key={i} style={{
                  display:"grid", gridTemplateColumns:"1fr 65px 75px 80px 80px",
                  padding:"9px 14px", alignItems:"center",
                  borderBottom:i<trader.positions.length-1?`1px solid ${PALETTE.border}`:"none",
                }}>
                  <span style={{ color:PALETTE.text, fontWeight:700, fontSize:13 }}>{p.coin}</span>
                  <SideBadge side={p.side} />
                  <span style={{ color:PALETTE.text, fontSize:12 }}>{formatUSD(p.positionValue)}</span>
                  <span style={{ color:PALETTE.muted, fontSize:11, fontFamily:"monospace" }}>
                    ${p.entryPx?Number(p.entryPx).toLocaleString("en",{maximumFractionDigits:2}):"—"}
                  </span>
                  <PnlBadge value={p.unrealizedPnl} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const PERIODS = [
  { key:"day", label:"День", field:"pnlDay" },
  { key:"week", label:"Тиждень", field:"pnlWeek" },
  { key:"month", label:"Місяць", field:"pnlMonth" },
  { key:"allTime", label:"Весь час", field:"pnlAllTime" },
];

export default function Home() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [period, setPeriod] = useState("allTime");

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null); setTraders([]); setStatus("Завантажую leaderboard…");
    try {
      const data = await hlFetch({ type:"leaderboard" });
      const rows = data?.leaderboardRows || [];
      if (!rows.length) throw new Error("Порожня відповідь");
      const pf = PERIODS.find(p=>p.key===period)?.field||"pnlAllTime";
      const top20 = [...rows]
        .filter(r=>r[pf]!=null)
        .sort((a,b)=>b[pf]-a[pf])
        .slice(0,20)
        .map(r=>({ ethAddress:r.ethAddress, pnl:r[pf], positions:[], positionsLoaded:false }));
      setTraders(top20); setLoading(false); setLastUpdate(new Date()); setStatus("↻ підтягую позиції…");
      for (let i=0; i<top20.length; i++) {
        try {
          const d = await hlFetch({ type:"clearinghouseState", user:top20[i].ethAddress });
          const positions = (d?.assetPositions||[])
            .filter(p=>parseFloat(p.position?.szi||0)!==0)
            .map(p=>({
              coin:p.position.coin,
              side:parseFloat(p.position.szi)>0?"long":"short",
              positionValue:Math.abs(parseFloat(p.position.positionValue||0)),
              entryPx:p.position.entryPx,
              unrealizedPnl:parseFloat(p.position.unrealizedPnl||0),
            }));
          setTraders(prev=>prev.map((t,idx)=>idx===i?{...t,positions,positionsLoaded:true}:t));
        } catch {
          setTraders(prev=>prev.map((t,idx)=>idx===i?{...t,positionsLoaded:true}:t));
        }
        await new Promise(r=>setTimeout(r,150));
      }
      setStatus("");
    } catch(e) {
      setError(e.message||"Помилка"); setLoading(false); setStatus("");
    }
  }, [period]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  return (
    <div style={{
      minHeight:"100vh", background:PALETTE.bg, color:PALETTE.text,
      fontFamily:"'Inter',system-ui,sans-serif", padding:"20px 14px",
      maxWidth:820, margin:"0 auto",
    }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <div style={{
            width:7, height:7, borderRadius:"50%",
            background:loading?PALETTE.muted:PALETTE.accentGlow,
            boxShadow:loading?"none":`0 0 8px ${PALETTE.accentGlow}`,
          }} />
          <span style={{ color:PALETTE.muted, fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>
            Hyperliquid · Live
          </span>
          {status && <span style={{ color:PALETTE.accent, fontSize:10, marginLeft:4 }}>{status}</span>}
        </div>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Топ 20 трейдерів</h1>
        {lastUpdate && <div style={{ color:PALETTE.muted, fontSize:10, marginTop:3 }}>{lastUpdate.toLocaleTimeString("uk")}</div>}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {PERIODS.map(p=>(
          <button key={p.key} onClick={()=>setPeriod(p.key)} style={{
            background:period===p.key?PALETTE.accent:PALETTE.surface,
            color:period===p.key?"#fff":PALETTE.muted,
            border:`1px solid ${period===p.key?PALETTE.accent:PALETTE.border}`,
            borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer",
          }}>{p.label}</button>
        ))}
        <button onClick={fetchData} disabled={loading} style={{
          marginLeft:"auto", background:"transparent",
          color:loading?PALETTE.muted:PALETTE.accentGlow,
          border:`1px solid ${PALETTE.border}`,
          borderRadius:8, padding:"6px 12px", fontSize:13, cursor:loading?"not-allowed":"pointer",
        }}>↻</button>
      </div>

      {loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:50 }}>
          <div style={{
            width:34, height:34, border:`3px solid ${PALETTE.border}`,
            borderTop:`3px solid ${PALETTE.accentGlow}`,
            borderRadius:"50%", animation:"spin 0.7s linear infinite",
          }} />
          <span style={{ color:PALETTE.muted, fontSize:12 }}>Завантажую…</span>
        </div>
      )}

      {error && (
        <div style={{
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)",
          borderRadius:10, padding:16, color:PALETTE.red, fontSize:13, textAlign:"center",
        }}>
          ⚠️ {error}
          <br/>
          <button onClick={fetchData} style={{
            marginTop:12, background:PALETTE.accent, color:"#fff",
            border:"none", borderRadius:8, padding:"8px 20px", fontSize:13, cursor:"pointer", fontWeight:600,
          }}>Спробувати ще раз</button>
        </div>
      )}

      {!loading && !error && traders.length>0 && (
        <>
          <ConsensusPanel traders={traders} />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {traders.map((t,i)=><TraderCard key={t.ethAddress} trader={t} rank={i+1}/>)}
          </div>
        </>
      )}
    </div>
  );
}
