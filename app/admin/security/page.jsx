"use client";
import { useEffect,useState } from "react";
export default function SecurityLog(){
 const [events,setEvents]=useState([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){const r=await fetch("/api/admin/security",{credentials:"same-origin",cache:"no-store"});const d=await r.json();if(r.ok)setEvents(d.events||[]);else setMessage(d.error||"Could not load security events")}
 useEffect(()=>{load()},[]);
 async function reconcile(){if(busy)return;setBusy(true);setMessage("");try{const r=await fetch("/api/tokens/reconcile",{method:"POST",credentials:"same-origin"});const d=await r.json();setMessage(r.ok?`Reconciliation complete: ${d.reconciled} reconciled, ${d.flagged} flagged.`:(d.error||"Reconciliation failed"))}catch{setMessage("Could not complete reconciliation. Please try again.")}finally{setBusy(false)}}
 return <main className="auth-page"><div className="auth-topbar"><a className="brand auth-brand" href="/">rsu<span>mart</span></a><a href="/admin/tokens">Admin</a></div><div className="admin-transfer-wrap"><p className="section-kicker">RSU MART · SECURITY</p><h1>Activity and purchase verification</h1><button className="admin-approve-button" onClick={reconcile} disabled={busy}>{busy?"Reconciling…":"Run 30-minute purchase reconciliation"}</button>{message&&<p className="admin-transfer-notice">{message}</p>}<div className="admin-transfer-list">{events.map((event,index)=><article className="admin-transfer-item" key={event._id||index}><h2>{event.type}</h2><p>{event.reason||event.reference||event.scope||""}</p><small>{new Date(event.createdAt).toLocaleString()}</small></article>)}</div></div></main>
}
