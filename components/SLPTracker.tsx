'use client';

import { useState, useEffect } from "react";

const TFS = ["1H", "45M", "30M", "15M"] as const;
const PAIRS = ["XAUUSD","EURUSD","GBPUSD","GBPJPY","USDJPY","EURJPY","NAS100","US30","BTCUSD","Other"] as const;
const STORE_KEY = "slp_backtest_v1";

type TradeType = "reversal" | "continuation" | null;
type YesNoPartial = "Yes" | "Partial" | "No" | null;
type YesNo = "Yes" | "No" | null;
type Bias = "Bullish" | "Bearish" | null;
type ResultType = "Win" | "Loss" | "Breakeven" | null;
type TF = typeof TFS[number];

interface Entry {
  id: string;
  date: string;
  pair: string;
  customPair: string;
  tradeType: TradeType;
  bias: Bias;
  klType: "OB" | "BB" | null;
  klReacted: YesNoPartial;
  mssFormed: YesNo;
  mssTF: TF | null;
  mssDir: Bias;
  doubleBOS: YesNo;
  doubleBOSTF: TF | null;
  doubleBOSDir: Bias;
  induced: YesNo;
  poiType: "OB" | "BB" | null;
  poiTF: TF | null;
  poiReacted: YesNoPartial;
  tradeTaken: YesNo;
  result: ResultType;
  rr: string;
  notes: string;
}

const fresh = (): Entry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
  date: new Date().toISOString().split("T")[0],
  pair: "XAUUSD",
  customPair: "",
  tradeType: null,
  bias: null,
  klType: null,
  klReacted: null,
  mssFormed: null,
  mssTF: null,
  mssDir: null,
  doubleBOS: null,
  doubleBOSTF: null,
  doubleBOSDir: null,
  induced: null,
  poiType: null,
  poiTF: null,
  poiReacted: null,
  tradeTaken: null,
  result: null,
  rr: "",
  notes: ""
});

const pct = (n: number, d: number): number => d ? Math.round((n / d) * 100) : 0;
const getType = (e: Entry): "reversal" | "continuation" => e.tradeType || "reversal";

export default function SLPTracker() {
  const [tab, setTab] = useState<"log" | "records" | "stats">("log");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState<Entry>(fresh());
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmClear, setCC] = useState(false);
  const [statsFilter, setSF] = useState<"all" | "reversal" | "continuation">("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load entries:", e);
    }
    setLoading(false);
  }, []);

  const persist = (arr: Entry[]) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const upd = <K extends keyof Entry>(k: K, v: Entry[K]) => {
    setForm(p => ({ ...p, [k]: v }));
  };

  const handleTypeChange = (v: TradeType) => {
    setForm({
      ...fresh(),
      tradeType: v,
    });
  };

  const handleLog = () => {
    const entry: Entry = {
      ...form,
      pair: form.pair === "Other" ? (form.customPair || "Other") : form.pair
    };
    const next = [entry, ...entries];
    setEntries(next);
    persist(next);
    setForm(fresh());
    setFlash("Entry saved!");
    setTimeout(() => setFlash(null), 2500);
    setTab("records");
  };

  const del = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    persist(entries.filter(e => e.id !== id));
  };

  const clearAll = () => {
    setEntries([]);
    persist([]);
    setCC(false);
  };

  const exportCSV = () => {
    const H = "Date,Pair,Type,Bias,KL_Type,KL_Reacted,MSS_Formed,MSS_TF,MSS_Dir,DoubleBOS,DoubleBOS_TF,DoubleBOS_Dir,Induced,POI_Type,POI_TF,POI_Reacted,Trade_Taken,Result,RR,Notes";
    const rows = entries.map(e =>
      [e.date, e.pair, getType(e), e.bias||"", e.klType||"", e.klReacted||"", e.mssFormed||"", e.mssTF||"", e.mssDir||"",
       e.doubleBOS||"", e.doubleBOSTF||"", e.doubleBOSDir||"", e.induced||"", e.poiType||"", e.poiTF||"", e.poiReacted||"",
       e.tradeTaken||"", e.result||"", e.rr||"", `"${(e.notes||"").replace(/"/g,'""')}"`].join(",")
    );
    const blob = new Blob([[H, ...rows].join("\n")], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slp_backtest.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const E = entries;
  const REV = E.filter(e => getType(e) === "reversal");
  const CONT = E.filter(e => getType(e) === "continuation");

  const obKL = REV.filter(e => e.klType === "OB");
  const bbKL = REV.filter(e => e.klType === "BB");
  const obKLR = obKL.filter(e => e.klReacted === "Yes" || e.klReacted === "Partial");
  const bbKLR = bbKL.filter(e => e.klReacted === "Yes" || e.klReacted === "Partial");
  const rKlR = REV.filter(e => e.klReacted === "Yes" || e.klReacted === "Partial");
  const rMssF = REV.filter(e => e.mssFormed === "Yes");
  const rIndF = REV.filter(e => e.induced === "Yes");
  const rPoiR = REV.filter(e => e.poiReacted === "Yes" || e.poiReacted === "Partial");
  const rTRD = REV.filter(e => e.tradeTaken === "Yes");
  const rWIN = rTRD.filter(e => e.result === "Win");
  const rLOS = rTRD.filter(e => e.result === "Loss");
  const rMssTF = TFS.map(tf => ({ tf, n: rMssF.filter(e => e.mssTF === tf).length }));

  const cBOS = CONT.filter(e => e.doubleBOS === "Yes");
  const cIndF = CONT.filter(e => e.induced === "Yes");
  const cPoiR = CONT.filter(e => e.poiReacted === "Yes" || e.poiReacted === "Partial");
  const cTRD = CONT.filter(e => e.tradeTaken === "Yes");
  const cWIN = cTRD.filter(e => e.result === "Win");
  const cLOS = cTRD.filter(e => e.result === "Loss");
  const cBOSTF = TFS.map(tf => ({ tf, n: cBOS.filter(e => e.doubleBOSTF === tf).length }));

  const allTRD = E.filter(e => e.tradeTaken === "Yes");
  const allWIN = allTRD.filter(e => e.result === "Win");
  const allLOS = allTRD.filter(e => e.result === "Loss");
  const allRR = allTRD.map(e => parseFloat(e.rr)).filter(n => !isNaN(n) && n > 0);
  const avgRR = allRR.length ? (allRR.reduce((a, b) => a + b, 0) / allRR.length).toFixed(2) : null;

  const fE = statsFilter === "reversal" ? REV : statsFilter === "continuation" ? CONT : E;
  const fTRD = fE.filter(e => e.tradeTaken === "Yes");
  const fWIN = fTRD.filter(e => e.result === "Win");
  const fLOS = fTRD.filter(e => e.result === "Loss");
  const fRR = fTRD.map(e => parseFloat(e.rr)).filter(n => !isNaN(n) && n > 0);
  const fAvgRR = fRR.length ? (fRR.reduce((a, b) => a + b, 0) / fRR.length).toFixed(2) : null;
  const fObPOI = fE.filter(e => e.poiType === "OB" && e.poiReacted);
  const fBbPOI = fE.filter(e => e.poiType === "BB" && e.poiReacted);
  const fObR = fObPOI.filter(e => e.poiReacted === "Yes" || e.poiReacted === "Partial");
  const fBbR = fBbPOI.filter(e => e.poiReacted === "Yes" || e.poiReacted === "Partial");

  const revFunnel = [
    { label: "Reversal setups", n: REV.length, d: null as number | null },
    { label: "Key level reacted", n: rKlR.length, d: REV.length },
    { label: "MSS formed", n: rMssF.length, d: rKlR.length },
    { label: "Inducement formed", n: rIndF.length, d: rMssF.length },
    { label: "Entry POI reacted", n: rPoiR.length, d: rIndF.length },
    { label: "Trades taken", n: rTRD.length, d: rPoiR.length },
    { label: "Wins", n: rWIN.length, d: rTRD.length },
  ];
  const contFunnel = [
    { label: "Continuation setups", n: CONT.length, d: null },
    { label: "Double BOS formed", n: cBOS.length, d: CONT.length },
    { label: "Inducement formed", n: cIndF.length, d: cBOS.length },
    { label: "Entry POI reacted", n: cPoiR.length, d: cIndF.length },
    { label: "Trades taken", n: cTRD.length, d: cPoiR.length },
    { label: "Wins", n: cWIN.length, d: cTRD.length },
  ];

  const isRev = form.tradeType === "reversal";
  const isCont = form.tradeType === "continuation";
  const rs2 = isRev && !!form.bias;
  const rs3 = rs2 && (form.klReacted === "Yes" || form.klReacted === "Partial");
  const rs4 = rs3 && form.mssFormed === "Yes";
  const rs5 = rs4 && form.induced === "Yes";
  const rs6 = rs5 && (form.poiReacted === "Yes" || form.poiReacted === "Partial");
  const cs2 = isCont && !!form.bias;
  const cs3 = cs2 && form.doubleBOS === "Yes";
  const cs4 = cs3 && form.induced === "Yes";
  const cs5 = cs4 && (form.poiReacted === "Yes" || form.poiReacted === "Partial");
  const canLog = isRev ? (!!form.bias && !!form.klType && !!form.klReacted) : isCont ? (!!form.bias && !!form.doubleBOS) : false;
  const saveTxt = !form.tradeType ? "Select a trade type to continue" : !form.bias ? "Select trade direction" : canLog ? "Save entry →" : "Complete the required fields to save";

  const rateC = (p: number) => p >= 60 ? "var(--color-text-success)" : p >= 40 ? "var(--color-text-warning)" : "var(--color-text-danger)";
  const rateBg = (p: number) => p >= 60 ? "var(--color-background-success)" : p >= 40 ? "var(--color-background-warning)" : "var(--color-background-danger)";

  if (loading) return <div className="flex items-center justify-center h-[200px] text-zinc-500">Loading tracker…</div>;

  // --------------------------------------------------------------------------
  // Helper components
  // --------------------------------------------------------------------------
  function Tog({ val, on, opts }: { val: any; on: (v: any) => void; opts: Array<{v: any, l: string, c?: string}> }) {
    return (
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {opts.map(o=>{
          const a=val===o.v;
          const bg=()=>{if(!a)return"transparent";if(o.c==="g")return"var(--color-background-success)";if(o.c==="r")return"var(--color-background-danger)";if(o.c==="b")return"var(--color-background-info)";return"var(--color-background-warning)";};
          const fg=()=>{if(!a)return"var(--color-text-secondary)";if(o.c==="g")return"var(--color-text-success)";if(o.c==="r")return"var(--color-text-danger)";if(o.c==="b")return"var(--color-text-info)";return"var(--color-text-warning)";};
          const bd=()=>{if(!a)return"0.5px solid var(--color-border-secondary)";if(o.c==="g")return"0.5px solid var(--color-border-success)";if(o.c==="r")return"0.5px solid var(--color-border-danger)";if(o.c==="b")return"0.5px solid var(--color-border-info)";return"0.5px solid var(--color-border-warning)";};
          return <button key={o.v} type="button" onClick={()=>on(val===o.v?null:o.v)} style={{padding:"6px 12px",borderRadius:"var(--border-radius-md)",border:bd(),background:bg(),color:fg(),fontSize:"13px",fontWeight:"500",cursor:"pointer",fontFamily:"var(--font-geist-sans)"}}>{o.l}</button>;
        })}
      </div>
    );
  }

  function Sec({n,blue,title,children}: {n: string; blue?: boolean; title: string; children: React.ReactNode}) {
    const bg=blue?"var(--color-background-info)":"var(--color-background-warning)";
    const fg=blue?"var(--color-text-info)":"var(--color-text-warning)";
    const bd=blue?"var(--color-border-info)":"var(--color-border-warning)";
    return (
      <div style={{marginBottom:"12px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",border:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
          <div style={{width:"20px",height:"20px",borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:fg,flexShrink:0,border:`0.5px solid ${bd}`}}>{n}</div>
          <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase"}}>{title}</div>
        </div>
        {children}
      </div>
    );
  }

  const Lbl = ({t}: {t: string}) => <div style={{fontSize:"12px",color:"var(--color-text-secondary)",fontWeight:"500",marginBottom:"6px"}}>{t}</div>;
  const iSty: React.CSSProperties = {
  width: "100%",
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)",
  padding: "7px 10px",
  color: "var(--color-text-primary)",
  fontSize: "13px",
  boxSizing: "border-box",
  fontFamily: "var(--font-geist-sans)"
};
  function Bar({n,d,c}: {n: number; d?: number; c?: string}) {
    const p = d ? pct(n,d) : 100;
    return <div style={{height:"4px",background:"var(--color-border-tertiary)",borderRadius:"2px",margin:"5px 0"}}><div style={{width:`${p}%`,height:"100%",background:c||rateBg(p),borderRadius:"2px",transition:"width 0.5s"}}/></div>;
  }

  function Badge({label,type}: {label: string; type: string}) {
    const M: Record<string,{bg:string,fg:string,bd:string}> = {
      bull:{bg:"var(--color-background-success)",fg:"var(--color-text-success)",bd:"var(--color-border-success)"},
      bear:{bg:"var(--color-background-danger)", fg:"var(--color-text-danger)", bd:"var(--color-border-danger)"},
      gold:{bg:"var(--color-background-warning)",fg:"var(--color-text-warning)",bd:"var(--color-border-warning)"},
      rev: {bg:"var(--color-background-info)",   fg:"var(--color-text-info)",   bd:"var(--color-border-info)"},
      cont:{bg:"var(--color-background-warning)",fg:"var(--color-text-warning)",bd:"var(--color-border-warning)"},
      win: {bg:"var(--color-background-success)",fg:"var(--color-text-success)",bd:"var(--color-border-success)"},
      loss:{bg:"var(--color-background-danger)", fg:"var(--color-text-danger)", bd:"var(--color-border-danger)"},
      be:  {bg:"var(--color-background-warning)",fg:"var(--color-text-warning)",bd:"var(--color-border-warning)"},
      muted:{bg:"var(--color-background-secondary)",fg:"var(--color-text-secondary)",bd:"var(--color-border-secondary)"},
    };
    const s = M[type] || M.muted;
    return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"var(--border-radius-md)",fontSize:"11px",fontWeight:"500",background:s.bg,color:s.fg,border:`0.5px solid ${s.bd}`}}>{label}</span>;
  }

  function RateCard({title,total,reacted}: {title: string; total: number; reacted: number}) {
    const p = pct(reacted,total);
    return (
      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",padding:"12px 14px",border:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{fontWeight:"500",fontSize:"14px",marginBottom:"8px"}}>{title}</div>
        <div style={{fontSize:"12px",color:"var(--color-text-secondary)"}}>Total: <b style={{color:"var(--color-text-primary)"}}>{total}</b></div>
        <div style={{fontSize:"12px",color:"var(--color-text-secondary)",marginBottom:"4px"}}>Reacted: <b style={{color:"var(--color-text-primary)"}}>{reacted}</b></div>
        <Bar n={reacted} d={total}/>
        <div style={{fontSize:"20px",fontWeight:"500",color:total>0?rateC(p):"var(--color-text-secondary)"}}>{total>0?`${p}%`:"—"}</div>
      </div>
    );
  }

  function Funnel({title,steps,warm}: {title: string; steps: Array<{label:string; n:number; d:number|null}>; warm: boolean}) {
    const colors = warm
      ?["var(--color-background-warning)","var(--color-background-warning)","var(--color-background-warning)","var(--color-background-success)","var(--color-background-success)","var(--color-background-success)"]
      :["var(--color-background-info)","var(--color-background-info)","var(--color-background-warning)","var(--color-background-warning)","var(--color-background-success)","var(--color-background-success)","var(--color-background-success)"];
    const tcs = warm
      ?["var(--color-text-warning)","var(--color-text-warning)","var(--color-text-warning)","var(--color-text-success)","var(--color-text-success)","var(--color-text-success)"]
      :["var(--color-text-info)","var(--color-text-info)","var(--color-text-warning)","var(--color-text-warning)","var(--color-text-success)","var(--color-text-success)","var(--color-text-success)"];
    return (
      <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",marginBottom:"12px"}}>
        <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"14px"}}>{title}</div>
        {steps.map((s,i)=>{
          const p = s.d ? pct(s.n,s.d) : 100;
          return (
            <div key={i} style={{marginBottom:i<steps.length-1?"12px":"0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"3px"}}>
                <span style={{fontSize:"13px",color:"var(--color-text-secondary)"}}>{s.label}</span>
                <span style={{fontSize:"13px",fontWeight:"500",color:tcs[i]||"var(--color-text-primary)"}}>
                  {s.n}{s.d !== null && <span style={{fontSize:"11px",color:"var(--color-text-secondary)",fontWeight:"400"}}> ({p}% of prev)</span>}
                </span>
              </div>
              <Bar n={s.n} d={s.d || s.n} c={colors[i]||"var(--color-background-info)"}/>
            </div>
          );
        })}
      </div>
    );
  }

  function TFBar({items,total,color}: {items: Array<{tf: string; n: number}>; total: number; color: string}) {
    return items.map(({tf,n}) => (
      <div key={tf} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"9px"}}>
        <div style={{width:"28px",fontSize:"12px",fontWeight:"500",flexShrink:0}}>{tf}</div>
        <div style={{flex:1,height:"6px",background:"var(--color-border-tertiary)",borderRadius:"3px"}}>
          <div style={{width:total?`${Math.round(n/total*100)}%`:"0%",height:"100%",background:color,borderRadius:"3px",transition:"width 0.5s"}}/>
        </div>
        <div style={{fontSize:"13px",fontWeight:"500",minWidth:"18px",textAlign:"right"}}>{n}</div>
        <div style={{fontSize:"11px",color:"var(--color-text-secondary)",minWidth:"38px"}}>{total && n ? `(${Math.round(n/total*100)}%)` : "  "}</div>
      </div>
    ));
  }

  const trBadge = (r: string | null, tt: string | null) => {
    if(r==="Win")  return <Badge label="Win"    type="win"/>;
    if(r==="Loss") return <Badge label="Loss"   type="loss"/>;
    if(r==="Breakeven") return <Badge label="B/E" type="be"/>;
    if(tt==="No")  return <Badge label="Missed" type="muted"/>;
    return <Badge label="—" type="muted"/>;
  };

  const hint = (tip: string) => (
    <div style={{marginBottom:"10px",padding:"8px 10px",background:"var(--color-background-warning)",borderRadius:"var(--border-radius-md)",fontSize:"12px",color:"var(--color-text-warning)",border:"0.5px solid var(--color-border-warning)"}}>
      {tip}
    </div>
  );

  // --------------------------------------------------------------------------
  // Main JSX (same as original, no changes except fixed typings)
  // --------------------------------------------------------------------------
  return (
    <div style={{fontFamily:"var(--font-geist-sans)",color:"var(--color-text-primary)",paddingBottom:"60px", background: 'var(--color-background-primary)'}}>
      <h2 className="sr-only">SLP Backtest Tracker — Reversal and Continuation setups</h2>

      <div style={{padding:"14px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--color-background-primary)"}}>
        <div>
          <div style={{fontWeight:"500",fontSize:"16px"}}>SLP Backtest Tracker</div>
          <div style={{fontSize:"12px",color:"var(--color-text-secondary)",marginTop:"2px"}}>
            <Badge label="↩ Rev" type="rev"/> <span style={{marginRight:"6px"}}>{REV.length}</span>
            <Badge label="→ Cont" type="cont"/> <span>{CONT.length}</span>
            <span style={{marginLeft:"8px",color:"var(--color-text-secondary)"}}>· {E.length} total setups</span>
          </div>
        </div>
        {allTRD.length>0&&(
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"15px",fontWeight:"500",color:pct(allWIN.length,allTRD.length)>=50?"var(--color-text-success)":"var(--color-text-danger)"}}>{pct(allWIN.length,allTRD.length)}% win rate</div>
            <div style={{fontSize:"11px",color:"var(--color-text-secondary)"}}>{allWIN.length}W · {allLOS.length}L{avgRR?` · ${avgRR}R avg`:""}</div>
          </div>
        )}
      </div>

      <div style={{display:"flex",borderBottom:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)"}}>
        {[["log","+ Log setup"],["records",`Records${E.length>0?` (${E.length})`:""}`],["stats","Statistics"]].map(([k,l])=>(
          <button key={k} type="button" onClick={()=>setTab(k as any)}
            style={{padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"500",fontFamily:"var(--font-geist-sans)",color:tab===k?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===k?"2px solid var(--color-text-primary)":"2px solid transparent"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"16px",maxWidth:"680px", margin: "0 auto"}}>
        {flash&&<div style={{background:"var(--color-background-success)",border:"0.5px solid var(--color-border-success)",borderRadius:"var(--border-radius-md)",padding:"9px 14px",color:"var(--color-text-success)",fontSize:"13px",fontWeight:"500",marginBottom:"12px"}}>✓ {flash}</div>}

        {/* LOG TAB */}
        {tab==="log"&&(
          <>
            <Sec n="1" title="Trade setup">
              <div style={{display:"flex",gap:"10px",marginBottom:"12px",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:"110px"}}>
                  <Lbl t="Date"/>
                  <input type="date" value={form.date} onChange={e=>upd("date",e.target.value)} style={iSty}/>
                </div>
                <div style={{flex:1,minWidth:"110px"}}>
                  <Lbl t="Instrument"/>
                  <select value={form.pair} onChange={e=>upd("pair",e.target.value)} style={iSty}>
                    {PAIRS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {form.pair==="Other"&&<div style={{flex:1,minWidth:"100px"}}><Lbl t="Custom pair"/><input value={form.customPair} onChange={e=>upd("customPair",e.target.value)} placeholder="e.g. GBPCHF" style={iSty}/></div>}
              </div>
              <div style={{marginBottom:"12px"}}>
                <Lbl t="Trade type"/>
                <Tog val={form.tradeType} on={handleTypeChange} opts={[{v:"reversal",l:"↩ Reversal",c:"b"},{v:"continuation",l:"→ Continuation",c:"y"}]}/>
              </div>
              {form.tradeType&&(
                <>
                  <Lbl t={isCont?"Trade direction (inherited from reversal)":"Daily bias"}/>
                  <Tog val={form.bias} on={v=>upd("bias",v)} opts={[{v:"Bullish",l:"▲ Bullish",c:"g"},{v:"Bearish",l:"▼ Bearish",c:"r"}]}/>
                </>
              )}
            </Sec>

            {/* REVERSAL PATH */}
            {rs2&&(
              <Sec n="2" blue title="Daily key level">
                <div style={{marginBottom:"10px"}}>
                  <Lbl t="Level type on the daily chart"/>
                  <Tog val={form.klType} on={v=>upd("klType",v)} opts={[{v:"OB",l:"OB — Order Block"},{v:"BB",l:"BB — Breaker Block"}]}/>
                </div>
                <Lbl t={`Did price reach & react to the daily ${form.klType||"level"}?`}/>
                <Tog val={form.klReacted} on={v=>upd("klReacted",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"Partial",l:"~ Partial",c:"b"},{v:"No",l:"✗ No",c:"r"}]}/>
              </Sec>
            )}
            {rs3&&(
              <Sec n="3" blue title="Market structure shift (MSS)">
                <div style={{marginBottom:"10px"}}>
                  <Lbl t="Did a clear MSS form on a lower timeframe?"/>
                  <Tog val={form.mssFormed} on={v=>upd("mssFormed",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"No",l:"✗ No",c:"r"}]}/>
                </div>
                {form.mssFormed==="Yes"&&<>
                  <div style={{marginBottom:"10px"}}><Lbl t="MSS timeframe"/><Tog val={form.mssTF} on={v=>upd("mssTF",v)} opts={TFS.map(tf=>({v:tf,l:tf}))}/></div>
                  <Lbl t="MSS direction"/><Tog val={form.mssDir} on={v=>upd("mssDir",v)} opts={[{v:"Bullish",l:"▲ Bullish",c:"g"},{v:"Bearish",l:"▼ Bearish",c:"r"}]}/>
                </>}
              </Sec>
            )}
            {rs4&&(
              <Sec n="4" blue title="Inducement / liquidity">
                <Lbl t="Did the first pullback (inducement) form after the MSS?"/>
                <Tog val={form.induced} on={v=>upd("induced",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"No",l:"✗ No",c:"r"}]}/>
              </Sec>
            )}
            {rs5&&(
              <Sec n="5" blue title="Entry POI">
                <div style={{display:"flex",gap:"10px",marginBottom:"10px",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:"130px"}}><Lbl t="POI type"/><Tog val={form.poiType} on={v=>upd("poiType",v)} opts={[{v:"OB",l:"OB"},{v:"BB",l:"BB"}]}/></div>
                  <div style={{flex:1,minWidth:"130px"}}><Lbl t="Entry timeframe"/><Tog val={form.poiTF} on={v=>upd("poiTF",v)} opts={TFS.map(tf=>({v:tf,l:tf}))}/></div>
                </div>
                <Lbl t="First unmitigated POI closest to inducement — did price react?"/>
                <Tog val={form.poiReacted} on={v=>upd("poiReacted",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"Partial",l:"~ Partial",c:"b"},{v:"No",l:"✗ No",c:"r"}]}/>
              </Sec>
            )}
            {rs6&&(
              <Sec n="6" blue title="Trade outcome">
                <div style={{marginBottom:"10px"}}><Lbl t="Did you take the trade?"/><Tog val={form.tradeTaken} on={v=>upd("tradeTaken",v)} opts={[{v:"Yes",l:"✓ Trade taken",c:"g"},{v:"No",l:"Missed / skipped",c:"r"}]}/></div>
                {form.tradeTaken==="Yes"&&<div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                  <div style={{flex:2,minWidth:"140px"}}><Lbl t="Result"/><Tog val={form.result} on={v=>upd("result",v)} opts={[{v:"Win",l:"Win",c:"g"},{v:"Loss",l:"Loss",c:"r"},{v:"Breakeven",l:"B/E"}]}/></div>
                  <div style={{flex:1,minWidth:"90px"}}><Lbl t="R:R achieved"/><input type="number" min="0" step="0.1" value={form.rr} onChange={e=>upd("rr",e.target.value)} placeholder="e.g. 2.5" style={iSty}/></div>
                </div>}
              </Sec>
            )}

            {/* CONTINUATION PATH */}
            {cs2&&(
              <Sec n="2" title="Double break of structure (BOS)">
                {hint("Two consecutive BOS in the direction of the reversal bias confirm trend continuation.")}
                <div style={{marginBottom:"10px"}}>
                  <Lbl t="Did a double BOS form in the trend direction?"/>
                  <Tog val={form.doubleBOS} on={v=>upd("doubleBOS",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"No",l:"✗ No",c:"r"}]}/>
                </div>
                {form.doubleBOS==="Yes"&&<>
                  <div style={{marginBottom:"10px"}}><Lbl t="BOS timeframe"/><Tog val={form.doubleBOSTF} on={v=>upd("doubleBOSTF",v)} opts={TFS.map(tf=>({v:tf,l:tf}))}/></div>
                  <Lbl t="BOS direction (should align with trade bias)"/><Tog val={form.doubleBOSDir} on={v=>upd("doubleBOSDir",v)} opts={[{v:"Bullish",l:"▲ Bullish",c:"g"},{v:"Bearish",l:"▼ Bearish",c:"r"}]}/>
                </>}
              </Sec>
            )}
            {cs3&&(
              <Sec n="3" title="Inducement after last BOS">
                <Lbl t="Did inducement (pullback) form after the second BOS?"/>
                <Tog val={form.induced} on={v=>upd("induced",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"No",l:"✗ No",c:"r"}]}/>
              </Sec>
            )}
            {cs4&&(
              <Sec n="4" title="Entry POI">
                {hint("Mark all OBs/BBs created between the two BOSs. Entry = first unmitigated POI closest to inducement.")}
                <div style={{display:"flex",gap:"10px",marginBottom:"10px",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:"130px"}}><Lbl t="POI type"/><Tog val={form.poiType} on={v=>upd("poiType",v)} opts={[{v:"OB",l:"OB"},{v:"BB",l:"BB"}]}/></div>
                  <div style={{flex:1,minWidth:"130px"}}><Lbl t="Entry timeframe"/><Tog val={form.poiTF} on={v=>upd("poiTF",v)} opts={TFS.map(tf=>({v:tf,l:tf}))}/></div>
                </div>
                <Lbl t="Did price react from the chosen POI?"/>
                <Tog val={form.poiReacted} on={v=>upd("poiReacted",v)} opts={[{v:"Yes",l:"✓ Yes",c:"g"},{v:"Partial",l:"~ Partial",c:"b"},{v:"No",l:"✗ No",c:"r"}]}/>
              </Sec>
            )}
            {cs5&&(
              <Sec n="5" title="Trade outcome">
                <div style={{marginBottom:"10px"}}><Lbl t="Did you take the trade?"/><Tog val={form.tradeTaken} on={v=>upd("tradeTaken",v)} opts={[{v:"Yes",l:"✓ Trade taken",c:"g"},{v:"No",l:"Missed / skipped",c:"r"}]}/></div>
                {form.tradeTaken==="Yes"&&<div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                  <div style={{flex:2,minWidth:"140px"}}><Lbl t="Result"/><Tog val={form.result} on={v=>upd("result",v)} opts={[{v:"Win",l:"Win",c:"g"},{v:"Loss",l:"Loss",c:"r"},{v:"Breakeven",l:"B/E"}]}/></div>
                  <div style={{flex:1,minWidth:"90px"}}><Lbl t="R:R achieved"/><input type="number" min="0" step="0.1" value={form.rr} onChange={e=>upd("rr",e.target.value)} placeholder="e.g. 2.5" style={iSty}/></div>
                </div>}
              </Sec>
            )}

            <div style={{marginBottom:"12px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",border:"0.5px solid var(--color-border-tertiary)"}}>
              <Lbl t="Notes / screenshot link (optional)"/>
              <textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} placeholder="TradingView link, confluences, observations…"
                style={{...iSty,minHeight:"60px",resize:"vertical",fontFamily:"var(--font-geist-sans)"}}/>
            </div>
            <button type="button" onClick={handleLog} disabled={!canLog}
              style={{width:"100%",padding:"11px",background:canLog?"var(--color-text-primary)":"var(--color-border-tertiary)",color:canLog?"var(--color-background-primary)":"var(--color-text-secondary)",border:"none",borderRadius:"var(--border-radius-lg)",fontSize:"14px",fontWeight:"500",cursor:canLog?"pointer":"not-allowed",fontFamily:"var(--font-geist-sans)"}}>
              {saveTxt}
            </button>
          </>
        )}

        {/* RECORDS TAB */}
        {tab==="records"&&(
          <>
            {E.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:"var(--color-text-secondary)"}}>
                <div style={{fontSize:"36px",marginBottom:"12px"}}>📋</div>
                <div style={{fontSize:"14px",marginBottom:"14px"}}>No entries yet. Log your first setup.</div>
                <button type="button" onClick={()=>setTab("log")} style={{padding:"8px 16px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",cursor:"pointer",fontWeight:"500",fontSize:"13px",background:"transparent",fontFamily:"var(--font-geist-sans)"}}>Start logging →</button>
              </div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",marginBottom:"12px"}}>
                  <button type="button" onClick={exportCSV} style={{padding:"6px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:"12px",fontWeight:"500",background:"transparent",fontFamily:"var(--font-geist-sans)"}}>↓ Export CSV</button>
                  {confirmClear?(
                    <div style={{display:"flex",gap:"6px"}}>
                      <button type="button" onClick={clearAll} style={{padding:"6px 12px",background:"var(--color-background-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-danger)",cursor:"pointer",fontSize:"12px",fontWeight:"500",fontFamily:"var(--font-geist-sans)"}}>Confirm clear all</button>
                      <button type="button" onClick={()=>setCC(false)} style={{padding:"6px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:"12px",background:"transparent",fontFamily:"var(--font-geist-sans)"}}>Cancel</button>
                    </div>
                  ):(
                    <button type="button" onClick={()=>setCC(true)} style={{padding:"6px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:"12px",background:"transparent",fontFamily:"var(--font-geist-sans)"}}>Clear all</button>
                  )}
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",tableLayout:"fixed",minWidth:"720px"}}>
                    <thead>
                      <tr style={{borderBottom:"0.5px solid var(--color-border-secondary)"}}>
                        {[["Date","68px"],["Pair","55px"],["Type","74px"],["Bias","68px"],["Key step","88px"],["Step react","72px"],["MSS / Induct.","96px"],["Induct.","60px"],["Entry POI","76px"],["POI react","68px"],["Result","68px"],["R:R","40px"],["","28px"]].map(([h,w])=>(
                          <th key={h} style={{textAlign:"left",padding:"7px 8px",color:"var(--color-text-secondary)",fontWeight:"500",fontSize:"11px",width:w}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {E.map(e=>{
                        const t=getType(e); const isR=t==="reversal";
                        const step2 = isR?(e.klType||"—"):"2x BOS";
                        const step2R = isR?e.klReacted:(e.doubleBOS||"—");
                        const step2Rc = isR
                          ?(e.klReacted==="Yes"?"var(--color-text-success)":e.klReacted==="Partial"?"var(--color-text-info)":e.klReacted==="No"?"var(--color-text-danger)":"var(--color-text-secondary)")
                          :(e.doubleBOS==="Yes"?"var(--color-text-success)":e.doubleBOS==="No"?"var(--color-text-danger)":"var(--color-text-secondary)");
                        const step3 = isR
                          ?(e.mssFormed==="Yes"?`MSS${e.mssTF?` (${e.mssTF})`:""}`:(e.mssFormed==="No"?"No MSS":"—"))
                          :(e.induced==="Yes"?"Induced":(e.induced==="No"?"No induct.":"—"));
                        const step3c = isR
                          ?(e.mssFormed==="Yes"?"var(--color-text-success)":e.mssFormed==="No"?"var(--color-text-danger)":"var(--color-text-secondary)")
                          :(e.induced==="Yes"?"var(--color-text-success)":e.induced==="No"?"var(--color-text-danger)":"var(--color-text-secondary)");
                        const induct = isR?(e.induced||"—"):"—";
                        const inductC = isR?(e.induced==="Yes"?"var(--color-text-success)":e.induced==="No"?"var(--color-text-danger)":"var(--color-text-secondary)"):"var(--color-text-secondary)";
                        return (
                          <tr key={e.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                            <td style={{padding:"7px 8px",color:"var(--color-text-secondary)",fontSize:"11px"}}>{e.date}</td>
                            <td style={{padding:"7px 8px",fontWeight:"500",fontSize:"12px"}}>{e.pair}</td>
                            <td style={{padding:"7px 8px"}}><Badge label={isR?"↩ Rev":"→ Cont"} type={isR?"rev":"cont"}/></td>
                            <td style={{padding:"7px 8px"}}><Badge label={e.bias==="Bullish"?"▲ Bull":"▼ Bear"} type={e.bias==="Bullish"?"bull":"bear"}/></td>
                            <td style={{padding:"7px 8px"}}><Badge label={step2} type="gold"/></td>
                            <td style={{padding:"7px 8px",fontSize:"12px",color:step2Rc}}>{step2R}</td>
                            <td style={{padding:"7px 8px",fontSize:"12px",color:step3c}}>{step3}</td>
                            <td style={{padding:"7px 8px",fontSize:"12px",color:inductC}}>{induct}</td>
                            <td style={{padding:"7px 8px"}}><Badge label={e.poiType?(e.poiTF?`${e.poiType} ${e.poiTF}`:e.poiType):"—"} type="gold"/></td>
                            <td style={{padding:"7px 8px",fontSize:"12px",color:e.poiReacted==="Yes"?"var(--color-text-success)":e.poiReacted==="Partial"?"var(--color-text-info)":e.poiReacted==="No"?"var(--color-text-danger)":"var(--color-text-secondary)"}}>{e.poiReacted||"—"}</td>
                            <td style={{padding:"7px 8px"}}>{trBadge(e.result,e.tradeTaken)}</td>
                            <td style={{padding:"7px 8px",fontSize:"12px",fontWeight:"500"}}>{e.rr?`${e.rr}R`:"—"}</td>
                            <td style={{padding:"7px 4px"}}><button type="button" onClick={()=>del(e.id)} title="Delete" style={{background:"none",border:"none",color:"var(--color-text-danger)",cursor:"pointer",fontSize:"12px",opacity:0.5,padding:"2px 4px",fontFamily:"var(--font-geist-sans)"}}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* STATS TAB */}
        {tab==="stats"&&(
          <>
            {E.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:"var(--color-text-secondary)"}}>
                <div style={{fontSize:"36px",marginBottom:"12px"}}>📊</div>
                <div style={{fontSize:"14px"}}>Log setups to see statistics.</div>
              </div>
            ):(
              <>
                <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>
                  {[["all","All setups"],["reversal","↩ Reversal"],["continuation","→ Continuation"]].map(([k,l])=>(
                    <button key={k} type="button" onClick={()=>setSF(k as any)}
                      style={{padding:"6px 12px",borderRadius:"var(--border-radius-md)",fontSize:"13px",fontWeight:"500",cursor:"pointer",fontFamily:"var(--font-geist-sans)",background:statsFilter===k?"var(--color-text-primary)":"transparent",color:statsFilter===k?"var(--color-background-primary)":"var(--color-text-secondary)",border:statsFilter===k?"none":"0.5px solid var(--color-border-secondary)"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {fE.length<20&&<div style={{background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-warning)",borderRadius:"var(--border-radius-md)",padding:"9px 14px",fontSize:"12px",color:"var(--color-text-warning)",marginBottom:"14px"}}>
                  ⚠ Aim for 20+ setups per type for reliable data. ({fE.length} in this view)
                </div>}

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"10px",marginBottom:"14px"}}>
                  {[
                    {l:"Setups",   v:fE.length,   c:"var(--color-text-primary)"},
                    {l:"Trades",   v:fTRD.length,  c:"var(--color-text-primary)"},
                    {l:"Win rate", v:`${pct(fWIN.length,fTRD.length)}%`, c:pct(fWIN.length,fTRD.length)>=50?"var(--color-text-success)":"var(--color-text-danger)", sub:`${fWIN.length}W / ${fLOS.length}L`},
                    {l:"Avg R:R",  v:fAvgRR?`${fAvgRR}R`:"—", c:"var(--color-text-primary)"},
                  ].map((c,i)=>(
                    <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"11px 13px",border:"0.5px solid var(--color-border-tertiary)"}}>
                      <div style={{fontSize:"11px",color:"var(--color-text-secondary)",fontWeight:"500",marginBottom:"4px"}}>{c.l}</div>
                      <div style={{fontSize:"22px",fontWeight:"500",color:c.c,lineHeight:"1"}}>{c.v}</div>
                      {c.sub&&<div style={{fontSize:"11px",color:"var(--color-text-secondary)",marginTop:"3px"}}>{c.sub}</div>}
                    </div>
                  ))}
                </div>

                {(statsFilter==="all"||statsFilter==="reversal")&&REV.length>0&&(
                  <>
                    <Funnel title="Reversal strategy funnel" steps={revFunnel} warm={false}/>
                    <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",marginBottom:"12px"}}>
                      <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"12px"}}>Reversal — daily key level reaction</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                        <RateCard title="Order Block (OB)" total={obKL.length} reacted={obKLR.length}/>
                        <RateCard title="Breaker Block (BB)" total={bbKL.length} reacted={bbKLR.length}/>
                      </div>
                    </div>
                    {rMssF.length>0&&(
                      <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                          <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase"}}>MSS by timeframe</div>
                          <div style={{fontSize:"11px",color:"var(--color-text-secondary)"}}>{rMssF.filter(e=>e.mssDir==="Bullish").length}▲ · {rMssF.filter(e=>e.mssDir==="Bearish").length}▼</div>
                        </div>
                        <TFBar items={rMssTF} total={rMssF.length} color="var(--color-background-info)"/>
                      </div>
                    )}
                  </>
                )}

                {(statsFilter==="all"||statsFilter==="continuation")&&CONT.length>0&&(
                  <>
                    <Funnel title="Continuation strategy funnel" steps={contFunnel} warm={true}/>
                    {cBOS.length>0&&(
                      <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                          <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase"}}>Double BOS by timeframe</div>
                          <div style={{fontSize:"11px",color:"var(--color-text-secondary)"}}>{cBOS.filter(e=>e.doubleBOSDir==="Bullish").length}▲ · {cBOS.filter(e=>e.doubleBOSDir==="Bearish").length}▼</div>
                        </div>
                        <TFBar items={cBOSTF} total={cBOS.length} color="var(--color-background-warning)"/>
                      </div>
                    )}
                  </>
                )}

                <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px",marginBottom:"12px"}}>
                  <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"12px"}}>Entry POI reaction rate</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                    <RateCard title="OB entry" total={fObPOI.length} reacted={fObR.length}/>
                    <RateCard title="BB entry" total={fBbPOI.length} reacted={fBbR.length}/>
                  </div>
                </div>

                {fE.some(e=>e.poiTF)&&(
                  <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"14px 16px"}}>
                    <div style={{fontSize:"12px",fontWeight:"500",color:"var(--color-text-secondary)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"12px"}}>Entry timeframe distribution</div>
                    <TFBar items={TFS.map(tf=>({tf,n:fE.filter(e=>e.poiTF===tf).length}))} total={fE.length} color="var(--color-background-success)"/>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}