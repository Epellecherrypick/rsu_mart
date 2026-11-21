"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminNav from "../admin-nav";

function submittedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminFinanceDashboard() {
  const [tab, setTab] = useState("requests");
  const [tokenRequests, setTokenRequests] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
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
      const [tokenResponse, withdrawalResponse] = await Promise.all([
        fetch("/api/admin/tokens", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/admin/withdrawals", { credentials: "same-origin", cache: "no-store" }),
      ]);
      const [tokenResult, withdrawalResult] = await Promise.all([
        tokenResponse.json(),
        withdrawalResponse.json(),
      ]);
      if (!tokenResponse.ok) throw new Error(tokenResult.error || "Could not load token purchase requests.");
      if (!withdrawalResponse.ok) throw new Error(withdrawalResult.error || "Could not load withdrawals.");
      setTokenRequests(tokenResult.requests || []);
      setWithdrawals(withdrawalResult.withdrawals || []);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError.message || "Could not load the finance queues.");
    } finally {
      if (!quiet) setLoading(false);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === "#withdrawals") setTab("withdrawals");
    load();
    const interval = window.setInterval(() => load(true), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function review(reference, action, endpoint, successMessage) {
    if (busy) return;
    setBusy(reference);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not review this request.");
      setNotice(successMessage);
      await load(true);
    } catch (reviewError) {
      setError(reviewError.message || "Could not review this request.");
    } finally {
      setBusy("");
    }
  }

  const pendingRequests = tokenRequests.filter((item) => item.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((item) => item.status === "pending").length;

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <a className="brand auth-brand" href="/admin" aria-label="RSU Mart admin overview">RSU Mart Admin</a>
        <a href="/admin">← Admin overview</a>
      </div>
      <AdminNav active="/admin/finance" />
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN FINANCE</p>
        <h1>Token purchase requests & withdrawals</h1>
        <p className="admin-transfer-intro">Review student token purchase requests and seller withdrawals. Confirm each transfer before approving it.</p>

        <div className="admin-finance-summary" aria-label="Pending finance requests">
          <button type="button" className={tab === "requests" ? "active" : ""} onClick={() => { setTab("requests"); window.history.replaceState(null, "", "#requests"); }} aria-pressed={tab === "requests"}>
            <span>Token purchase requests</span><strong>{pendingRequests}</strong>
          </button>
          <button type="button" className={tab === "withdrawals" ? "active" : ""} onClick={() => { setTab("withdrawals"); window.history.replaceState(null, "", "#withdrawals"); }} aria-pressed={tab === "withdrawals"}>
            <span>Seller withdrawals</span><strong>{pendingWithdrawals}</strong>
          </button>
        </div>
        <div className="admin-transfer-toolbar">
          <p>{tab === "requests" ? "Token purchase requests" : "Seller withdrawals"}</p>
          <span className="admin-last-updated">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })} · auto-refresh 30s` : "Auto-refresh every 30 seconds"}</span>
          <button type="button" onClick={() => load()} disabled={loading || !!busy}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="admin-transfer-notice" role="status">{notice}</p>}

        {loading ? <p className="admin-queue-loading" role="status">Loading {tab === "requests" ? "token purchase requests" : "withdrawal requests"}…</p> : tab === "requests" ? (
          tokenRequests.length ? <div className="admin-transfer-list">
            {tokenRequests.map((item) => (
              <article className="admin-transfer-item" key={item.reference}>
                <div className="admin-transfer-item-heading">
                  <div><p className="section-kicker">{item.status === "pending" ? "AWAITING APPROVAL" : String(item.status).toUpperCase()}</p><h2>{item.reference}</h2></div>
                  <strong>{Number(item.tokens || 0).toLocaleString("en-NG")} tokens</strong>
                </div>
                <dl>
                  <div><dt>Account</dt><dd>{item.customer?.name || "Unknown account"}</dd></div>
                  <div><dt>Email</dt><dd>{item.customer?.email || "Unavailable"}</dd></div>
                  <div><dt>Payment reference</dt><dd>{item.paymentReference || "—"}</dd></div>
                  <div><dt>Submitted</dt><dd>{submittedDate(item.createdAt)}</dd></div>
                </dl>
                {item.status === "pending" && <div className="admin-transfer-actions">
                  <button type="button" className="admin-approve-button" disabled={!!busy} onClick={() => review(item.reference, "approve", "/api/admin/tokens", "Token purchase approved. The token balance has been credited.")}>{busy === item.reference ? "Approving…" : "Approve token request"}</button>
                  <button type="button" className="admin-reject-button" disabled={!!busy} onClick={() => review(item.reference, "reject", "/api/admin/tokens", "Token purchase request rejected.")}>{busy === item.reference ? "Updating…" : "Reject"}</button>
                </div>}
              </article>
            ))}
          </div> : <div className="admin-transfer-empty"><h2>No token purchase requests yet.</h2><p>Requests submitted through the token wallet will appear here for review.</p></div>
        ) : (
          withdrawals.length ? <div className="admin-transfer-list">
            {withdrawals.map((item) => (
              <article className="admin-transfer-item" key={item.reference}>
                <div className="admin-transfer-item-heading">
                  <div><p className="section-kicker">{item.status === "pending" ? "AWAITING PAYMENT" : String(item.status).toUpperCase()}</p><h2>{item.reference}</h2></div>
                  <strong>₦{Number(item.tokens || 0).toLocaleString("en-NG")}</strong>
                </div>
                <dl>
                  <div><dt>Account name</dt><dd>{item.accountName || "—"}</dd></div>
                  <div><dt>Account number</dt><dd>{item.accountNumber || "—"}</dd></div>
                  <div><dt>Phone</dt><dd>{item.phone || "—"}</dd></div>
                  <div><dt>Submitted</dt><dd>{submittedDate(item.createdAt)}</dd></div>
                </dl>
                {item.status === "pending" && <div className="admin-transfer-actions">
                  <button type="button" className="admin-approve-button" disabled={!!busy} onClick={() => review(item.reference, "paid", "/api/admin/withdrawals", "Withdrawal marked as paid.")}>{busy === item.reference ? "Updating…" : "Mark cash paid"}</button>
                  <button type="button" className="admin-reject-button" disabled={!!busy} onClick={() => review(item.reference, "rejected", "/api/admin/withdrawals", "Withdrawal rejected and tokens returned.")}>{busy === item.reference ? "Updating…" : "Reject"}</button>
                </div>}
              </article>
            ))}
          </div> : <div className="admin-transfer-empty"><h2>No withdrawal requests yet.</h2><p>Seller withdrawal requests will appear here for processing.</p></div>
        )}
      </div>
    </main>
  );
}
