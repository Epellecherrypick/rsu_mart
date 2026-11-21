"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminNav from "../admin-nav";

function timestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminReportsDashboard() {
  const [events, setEvents] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestInFlight = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/security", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load reports and monitoring data.");
      setEvents(result.events || []);
      setFlagged(result.flaggedAccounts || []);
      setPurchases(result.purchases || []);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError.message || "Could not load reports and monitoring data.");
    } finally {
      if (!quiet) setLoading(false);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function reconcile() {
    if (reconciling) return;
    setReconciling(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/tokens/reconcile", { method: "POST", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reconciliation failed.");
      setNotice(`Reconciliation complete: ${result.reconciled} reconciled, ${result.flagged} flagged.`);
      await load(true);
    } catch (reconcileError) {
      setError(reconcileError.message || "Could not complete reconciliation.");
    } finally {
      setReconciling(false);
    }
  }

  const crawlerEvents = events.filter((event) => event.type === "crawler_blocked");
  const rateLimitEvents = events.filter((event) => event.type === "rate_limit");
  const reconciliationEvents = events.filter((event) => event.type === "token_reconciliation");
  const attentionPurchases = purchases.filter((purchase) => ["pending_reconciliation", "reconciliation_failed"].includes(purchase.status));

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <a className="brand auth-brand" href="/admin" aria-label="RSU Mart admin overview">RSU Mart Admin</a>
        <a href="/admin">← Admin overview</a>
      </div>
      <AdminNav active="/admin/reports" />
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN REPORTS</p>
        <h1>Reports, flagged accounts & monitoring</h1>
        <p className="admin-transfer-intro">Review suspicious activity, token purchase reconciliation, and accounts that need attention.</p>
        <div className="admin-transfer-toolbar">
          <span className="admin-last-updated">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })} · auto-refresh 30s` : "Auto-refresh every 30 seconds"}</span>
          <button type="button" onClick={() => load()} disabled={loading || reconciling}>{loading ? "Refreshing…" : "Refresh reports"}</button>
          <button type="button" className="admin-approve-button" onClick={reconcile} disabled={loading || reconciling}>{reconciling ? "Reconciling…" : "Run 30-minute reconciliation"}</button>
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="admin-transfer-notice" role="status">{notice}</p>}

        <section className="admin-report-section" aria-labelledby="monitoring-title">
          <div className="admin-report-heading"><div><p className="section-kicker">LIVE MONITORING</p><h2 id="monitoring-title">Activity at a glance</h2></div><span>{loading ? "Updating…" : "Latest 500 events"}</span></div>
          <div className="admin-monitor-grid">
            <article><span>Flagged accounts</span><strong>{loading ? "—" : flagged.length}</strong><small>Currently marked for review</small></article>
            <article><span>Requests blocked</span><strong>{loading ? "—" : crawlerEvents.length}</strong><small>Automated or crawler traffic</small></article>
            <article><span>Rate limits</span><strong>{loading ? "—" : rateLimitEvents.length}</strong><small>Throttled requests logged</small></article>
            <article><span>Purchases to reconcile</span><strong>{loading ? "—" : attentionPurchases.length}</strong><small>Pending or failed checks</small></article>
          </div>
          <p className="admin-report-footnote">Most recent reconciliation: {reconciliationEvents.length ? timestamp(reconciliationEvents[0].createdAt) : "No reconciliation recorded"}</p>
        </section>

        <section className="admin-report-section" aria-labelledby="flagged-title">
          <div className="admin-report-heading"><div><p className="section-kicker">ACCOUNT REVIEW</p><h2 id="flagged-title">Flagged accounts</h2></div><strong>{loading ? "—" : flagged.length}</strong></div>
          {loading ? <p className="admin-queue-loading" role="status">Loading flagged accounts…</p> : flagged.length ? <div className="admin-transfer-list">
            {flagged.map((account) => <article className="admin-transfer-item" key={account.id}>
              <div className="admin-transfer-item-heading"><div><h3>{account.name || "Unknown account"}</h3><p>{account.email || "No email on file"}</p></div><strong>{account.accountFlag?.type || "Flagged"}</strong></div>
              <small>Flagged {timestamp(account.accountFlag?.createdAt)}</small>
            </article>)}
          </div> : <p className="admin-transfer-empty">No accounts are currently flagged.</p>}
        </section>

        <section className="admin-report-section" aria-labelledby="purchases-title">
          <div className="admin-report-heading"><div><p className="section-kicker">PURCHASE REPORT</p><h2 id="purchases-title">Token purchases</h2></div><a href="/admin/finance">Open token requests →</a></div>
          {loading ? <p className="admin-queue-loading" role="status">Loading purchase report…</p> : purchases.length ? <div className="admin-transfer-list">
            {purchases.map((purchase) => <article className="admin-transfer-item" key={purchase.reference}>
              <div className="admin-transfer-item-heading"><h3>{purchase.reference}</h3><strong>{Number(purchase.amount || 0).toLocaleString("en-NG")} tokens</strong></div>
              <p>Status: {String(purchase.status || "unknown").replaceAll("_", " ")}</p>
              <small>{timestamp(purchase.createdAt)}</small>
            </article>)}
          </div> : <p className="admin-transfer-empty">No token purchases recorded.</p>}
        </section>

        <section className="admin-report-section" aria-labelledby="events-title">
          <div className="admin-report-heading"><div><p className="section-kicker">AUDIT LOG</p><h2 id="events-title">Logged events</h2></div><strong>{loading ? "—" : events.length}</strong></div>
          {loading ? <p className="admin-queue-loading" role="status">Loading logged events…</p> : events.length ? <div className="admin-transfer-list">
            {events.map((event, index) => <article className="admin-transfer-item admin-event-item" key={event._id || `${event.type}-${index}`}>
              <div className="admin-transfer-item-heading"><h3>{String(event.type || "Security event").replaceAll("_", " ")}</h3><time>{timestamp(event.createdAt)}</time></div>
              <p>{event.reason || event.reference || event.scope || event.action || "Security event recorded"}</p>
              {(event.ip || event.identifier || event.userAgent) && <dl>
                {event.ip && <div><dt>IP address</dt><dd>{event.ip}</dd></div>}
                {event.identifier && <div><dt>Identifier</dt><dd>{event.identifier}</dd></div>}
                {event.userAgent && <div><dt>User agent</dt><dd>{event.userAgent}</dd></div>}
              </dl>}
            </article>)}
          </div> : <p className="admin-transfer-empty">No logged events.</p>}
        </section>
      </div>
    </main>
  );
}
