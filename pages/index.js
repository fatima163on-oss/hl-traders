import { useState, useEffect, useCallback } from "react";

export default function Home() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [period, setPeriod] = useState("allTime");
  const [openCards, setOpenCards] = useState({});

  const PERIODS = [
    {key:"day",label:"День",field:"pnlDay"},
    {key:"week",label:"Тиждень",field:"pnlWeek"},
    {key:"month",label:"Місяць",field:"pnlMonth"},
    {key:"allTime",label:"Весь час",field:"pnlAllTime"},
  ];

  const fmt = (n) => {
    if (n==null) return "$0";
    const a=Math.abs(n);
    if(a>=1e6) return `$${(n/1e6).toFixed(2)}M`;
    if(a>=1e3) return `$${(n/1e3).toFixed(1)}K`;
    return `$${Number(n).toFixed(0)}`;
  };

  const addr = (a) => a?`${a.slice(0,6)}…${a.slice(-4)}`:"—";

  const load = useCallback(async () => {
    setLoading(true); setError(null); setTraders([]); setStatus("Завантажую…");
    try {
      const pf = PERIODS.find(p=>p.key===period)?.field||"pnlAllTime";
      const r = await fetch("https://hl-proxy-production.up.railway.app", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"leaderboard"})});
      const data = await r.json();
      const rows = data?.leaderboardRows||[];
      if(!rows.length) throw new Error("Порожня відповідь");
      const top = [...rows].filter(r=>r[pf]!=null).sort((a,b)=>b[pf]-a[pf]).slice(0,20)
        .map(r=>({addr:r.ethAddress,pnl:r[pf],pos:[],loaded:false}));
      setTraders(top); setLoading(false); setUpdated(new Date()); setStatus("↻ позиції…");
      for(let i=0;i<top.length;i++){
        try{
          const r2=await fetch("https://hl-proxy-production.up.railway.app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"clearinghouseState",user:top[i].addr})});)});
          const d=await r2.json();
          const pos=(d?.assetPositions||[]).filter(p=>parseFloat(p.position?.szi||0)!==0)
            .map(p=>({coin:p.position.coin,side:parseFloat(p.position.szi)>0?"long":"short",positionValue:Math.abs(parseFloat(p.position.positionValue||0)),entryPx:p.position.entryPx,unrealizedPnl:parseFloat(p.position.unrealizedPnl||0)}));
          setTraders(prev=>prev.map((t,idx)=>idx===i?{...t,pos,loaded:true}:t));
        }catch{ setTraders(prev=>prev.map((t,idx)=>idx===i?{...t,loaded:true}:t)); }
        await new Promise(r=>setTimeout(r,150));
      }
      setStatus("");
    }catch(e){ setError(e.message); setLoading(false); setStatus(""); }
  }, [period]);

  useEffect(()=>{load();},[load]);

  const G="#22c55e", R="#ef4444", BG="#0a0a0f", S="#111118", B="#1e1e2e", A="#7c3aed", AG="#a855f7", T="#e2e8f0", M="#64748b";
  const rankBg = i=>["linear-gradient(135deg,#f59e0b,#1a1a2e)","linear-gradient(135deg,#94a3b8,#1a1a2e)","linear-gradient(135deg,#cd7f32,#1a1a2e)"][i]||`linear-gradient(135deg,${A},#1a1a2e)`;

  return (
    <div style={{minHeight:"100vh",background:BG,color:T,fontFamily:"Inter,system-ui,sans-serif",padding:"20px 14px"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}button{font-family:inherit}`}</style>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:loading?M:AG,boxShadow:loading?"none":`0 0 8px ${AG}`}}/>
            <span style={{color:M,fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Hyperliquid · Live</span>
            {status&&<span style={{color:A,fontSize:10,marginLeft:8}}>{status}</span>}
          </div>
          <h1 style={{fontSize:22,fontWeight:800}}>Топ 20 трейдерів</h1>
          {updated&&<div style={{color:M,fontSize:10,marginTop:3}}>{updated.toLocaleTimeString("uk")}</div>}
        </div>

        <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>setPeriod(p.key)} style={{background:period===p.key?A:S,color:period===p.key?"#fff":M,border:`1px solid ${period===p.key?A:B}`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              {p.label}
            </button>
          ))}
          <button onClick={load} disabled={loading} style={{marginLeft:"auto",background:"transparent",color:loading?M:AG,border:`1px solid ${B}`,borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer"}}>↻</button>
        </div>

        {loading&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:50}}>
            <div style={{width:34,height:34,border:`3px solid ${B}`,borderTop:`3px solid ${AG}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
            <span style={{color:M,fontSize:12}}>Завантажую…</span>
          </div>
        )}

        {error&&(
          <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:16,color:R,fontSize:13,textAlign:"center"}}>
            ⚠️ {error}
            <br/>
            <button onClick={load} style={{marginTop:12,background:A,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,cursor:"pointer",fontWeight:600}}>Спробувати ще раз</button>
          </div>
        )}

        {!loading&&!error&&traders.length>0&&(
          <>
            {(()=>{
              const map={};
              traders.forEach(t=>(t.pos||[]).forEach(p=>{if(!map[p.coin])map[p.coin]={long:0,short:0};map[p.coin][p.side]++;}));
              const sorted=Object.entries(map).map(([coin,v])=>({coin,...v,total:v.long+v.short})).sort((a,b)=>b.total-a.total).slice(0,10);
              if(!sorted.length) return null;
              return(
                <div style={{background:S,border:`1px solid ${B}`,borderRadius:12,padding:16,marginBottom:16}}>
                  <div style={{color:M,fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>🔥 Консенсус</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {sorted.map(c=>(
                      <div key={c.coin} style={{background:BG,border:`1px solid ${c.long>=c.short?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,borderRadius:8,padding:"7px 11px"}}>
                        <div style={{fontWeight:700,fontSize:13}}>{c.coin}</div>
                        <div style={{display:"flex",gap:6,fontSize:11,marginTop:3}}>
                          <span style={{color:G}}>▲{c.long}</span>
                          <span style={{color:R}}>▼{c.short}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {traders.map((t,i)=>{
                const isOpen=openCards[i];
                return(
                  <div key={i} onClick={()=>setOpenCards(o=>({...o,[i]:!o[i]}))} style={{background:S,border:`1px solid ${isOpen?A:B}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"border-color 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
                      <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:rankBg(i),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:10,color:"#fff"}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:11,fontFamily:"monospace",color:T}}>{addr(t.addr)}</div>
                        <div style={{color:M,fontSize:10,marginTop:1}}>{t.loaded?(t.pos.length?`${t.pos.length} позицій`:"нема"):"завантажую…"}</div>
                      </div>
                      <div style={{textAlign:"right",marginRight:6}}>
                        <div style={{fontSize:10,color:M}}>PnL</div>
                        <div style={{fontWeight:700,fontSize:13,color:t.pnl>=0?G:R}}>{t.pnl>=0?"+":""}{fmt(t.pnl)}</div>
                      </div>
                      <span style={{color:isOpen?AG:M,fontSize:13,transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.2s",display:"block",flexShrink:0}}>▾</span>
                    </div>
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${B}`}} onClick={e=>e.stopPropagation()}>
                        {!t.loaded?(
                          <div style={{padding:"14px 16px",color:M,fontSize:12}}>↻ завантажую…</div>
                        ):!t.pos.length?(
                          <div style={{padding:"14px 16px",color:M,fontSize:12}}>Немає відкритих позицій</div>
                        ):(
                          <>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 65px 75px 80px 80px",padding:"7px 14px",color:M,fontSize:9,letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${B}`}}>
                              <span>Монета</span><span>Сайд</span><span>Розмір</span><span>Вхід</span><span>PnL</span>
                            </div>
                            {t.pos.map((p,pi)=>(
                              <div key={pi} style={{display:"grid",gridTemplateColumns:"1fr 65px 75px 80px 80px",padding:"9px 14px",alignItems:"center",borderBottom:pi<t.pos.length-1?`1px solid ${B}`:"none"}}>
                                <span style={{fontWeight:700,fontSize:13,color:T}}>{p.coin}</span>
                                <span style={{background:p.side==="long"?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",color:p.side==="long"?G:R,border:`1px solid ${p.side==="long"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{p.side}</span>
                                <span style={{fontSize:12,color:T}}>{fmt(p.positionValue)}</span>
                                <span style={{fontSize:11,fontFamily:"monospace",color:M}}>${p.entryPx?Number(p.entryPx).toLocaleString("en",{maximumFractionDigits:2}):"—"}</span>
                                <span style={{fontWeight:700,fontSize:13,color:p.unrealizedPnl>=0?G:R}}>{p.unrealizedPnl>=0?"+":""}{fmt(p.unrealizedPnl)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
