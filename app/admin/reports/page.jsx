"use client";

import { useEffect, useState } from "react";

export default function AdminReportsDashboard() {
  const [events, setEvents] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/security", { credentials: "same-origin", cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Could not load reports.");
      return;
    }
    setEvents(result.events || []);
    setFlagged(result.flaggedAccounts || []);
    setPurchases(result.purchases || []);
  }

  useEffect(() => { load(); }, []);

  async function reconcile() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/tokens/reconcile", { method: "POST", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reconciliation failed.");
      setMessage(`Reconciliation complete: ${result.reconciled} reconciled, ${result.flagged} flagged.`);
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <a className="brand auth-brand" href="/admin">RSU Mart Admin</a>
        <a href="/admin">← All dashboards</a>
      </div>
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN REPORTS</p>
        <h1>Reports, flagged accounts & monitoring</h1>
        <div className="admin-transfer-toolbar">
          <button type="button" onClick={load}>Refresh reports</button>
          <button type="button" onClick={reconcile} disabled={busy}>{busy ? "Checking…" : "Run 30-minute reconciliation"}</button>
        </div>
        {message && <p className="admin-transfer-notice">{message}</p>}

        <h2>Flagged accounts</h2>
        <div className="admin-transfer-list">
          {flagged.length ? flagged.map((account) => (
            <article className="admin-transfer-item" key={account.id}>
              <h2>{account.name || "Unknown account"}</h2>
              <p>{account.email}</p>
              <strong>{account.accountFlag?.type || "Flagged"}</strong>
            </article>
          )) : <p className="admin-transfer-empty">No flagged accounts.</p>}
        </div>

        <h2>Token purchases</h2>
        <div className="admin-transfer-list">
          {purchases.length ? purchases.map((purchase) => (
            <article className="admin-transfer-item" key={purchase.reference}>
              <h2>{purchase.reference}</h2>
              <p>{purchase.amount} tokens · {purchase.status}</p>
            </article>
          )) : <p className="admin-transfer-empty">No token purchases recorded.</p>}
        </div>

        <h2>Logged events</h2>
        <div className="admin-transfer-list">
          {events.length ? events.map((event, index) => (
            <article className="admin-transfer-item" key={event._id || index}>
              <h2>{event.type}</h2>
              <p>{event.reason || event.reference || event.scope || "Security event"}</p>
              <small>{event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}</small>
            </article>
          )) : <p className="admin-transfer-empty">No logged events.</p>}
        </div>
      </div>
    </main>
  );
}
