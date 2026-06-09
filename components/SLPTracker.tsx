'use client';

import { useState, useEffect } from "react";

const TFS = ["1H", "45M", "30M", "15M"] as const;
const PAIRS = ["XAUUSD","EURUSD","GBPUSD","GBPJPY","USDJPY","EURJPY","NAS100","US30","BTCUSD","Other"] as const;

const STORE_KEY = "slp_backtest_v1";

// Define the exact shape of a form entry (all fields present)
type FormEntry = {
  id: string;
  date: string;
  pair: string;
  customPair: string;
  tradeType: "reversal" | "continuation" | null;
  bias: "Bullish" | "Bearish" | null;
  klType: "OB" | "BB" | null;
  klReacted: "Yes" | "Partial" | "No" | null;
  mssFormed: "Yes" | "No" | null;
  mssTF: typeof TFS[number] | null;
  mssDir: "Bullish" | "Bearish" | null;
  doubleBOS: "Yes" | "No" | null;
  doubleBOSTF: typeof TFS[number] | null;
  doubleBOSDir: "Bullish" | "Bearish" | null;
  induced: "Yes" | "No" | null;
  poiType: "OB" | "BB" | null;
  poiTF: typeof TFS[number] | null;
  poiReacted: "Yes" | "Partial" | "No" | null;
  tradeTaken: "Yes" | "No" | null;
  result: "Win" | "Loss" | "Breakeven" | null;
  rr: string;
  notes: string;
};

// Entry for storage (same as FormEntry but with optional fields for saved entries)
// Actually we can reuse FormEntry for consistency
type Entry = FormEntry;

const fresh = (): FormEntry => ({
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
  const [form, setForm] = useState<FormEntry>(fresh());
  const [loading, setLoading] = useState<boolean>(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmClear, setCC] = useState<boolean>(false);
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

  const persist = (arr: Entry[]): void => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const upd = <K extends keyof FormEntry>(k: K, v: FormEntry[K]): void => {
    setForm(p => ({ ...p, [k]: v }));
  };

  const handleTypeChange = (v: "reversal" | "continuation" | null): void => {
    setForm({
      ...fresh(),
      tradeType: v,
    });
  };

  const handleLog = (): void => {
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

  const del = (id: string): void => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    persist(next);
  };

  const clearAll = (): void => { 
    setEntries([]); 
    persist([]); 
    setCC(false); 
  };

  const exportCSV = (): void => {
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

  const rateC = (p: number): string => p >= 60 ? "var(--color-text-success)" : p >= 40 ? "var(--color-text-warning)" : "var(--color-text-danger)";
  const rateBg = (p: number): string => p >= 60 ? "var(--color-background-success)" : p >= 40 ? "var(--color-background-warning)" : "var(--color-background-danger)";

  if (loading) return <div className="flex items-center justify-center h-[200px] text-zinc-500">Loading tracker…</div>;

  // Helper components with proper typings
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
  const iSty = {width:"100%",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"7px 10px",color:"var(--color-text-primary)",fontSize:"13px",boxSizing:"border-box",fontFamily:"var(--font-geist-sans)"};

  function Bar({n,d,c}: {n: number; d?: number; c?: string}) {
    const p=d?pct(n,d):100;
    return <div style={{height:"4px",background:"var(--color-border-tertiary)",borderRadius:"2px",margin:"5px 0"}}><div style={{width:`${p}%`,height:"100%",background:c||rateBg(p),borderRadius:"2px",transition:"width 0.5s"}}/></div>;
  }

  function Badge({label,type}: {label: string; type: string}) {
    const M: Record<string, {bg: string, fg: string, bd: string}> = {
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

  function Funnel({title,steps,warm}: {title: string; steps: Array<{label: string; n: number; d: number | null}>; warm: boolean}) {
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
    if(r==="Breakeven") return <Badge label="Breakeven" type="be"/>;
    return <Badge label="—" type="muted"/>;
  }
