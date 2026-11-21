"use client";

import { useEffect, useState } from "react";

export default function AdminFinanceDashboard() {
  const [tab, setTab] = useState("tokens");
  const [tokenRequests, setTokenRequests] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");
    const [tokenResponse, withdrawalResponse] = await Promise.all([
      fetch("/api/admin/tokens", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/withdrawals", { credentials: "same-origin", cache: "no-store" }),
    ]);
    const tokenResult = await tokenResponse.json();
    const withdrawalResult = await withdrawalResponse.json();
    if (!tokenResponse.ok) { setMessage(tokenResult.error || "Could not load token requests."); return; }
    if (!withdrawalResponse.ok) { setMessage(withdrawalResult.error || "Could not load withdrawals."); return; }
    setTokenRequests(tokenResult.requests || []);
    setWithdrawals(withdrawalResult.withdrawals || []);
  }

  useEffect(() => { load(); }, []);

  async function reviewToken(item, action) {
    setBusy(item.reference);
    setMessage("");
    const response = await fetch("/api/admin/tokens", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: item.reference, action }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Token purchase request reviewed." : result.error || "Could not review token request.");
    await load();
    setBusy("");
  }

  async function reviewWithdrawal(item, action) {
    setBusy(item.reference);
    setMessage("");
    const response = await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: item.reference, action }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Withdrawal reviewed." : result.error || "Could not review withdrawal.");
    await load();
    setBusy("");
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <a className="brand auth-brand" href="/admin">RSU Mart Admin</a>
        <a href="/admin">← All dashboards</a>
      </div>
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN FINANCE</p>
        <h1>Token purchases & withdrawals</h1>
        <div className="admin-transfer-toolbar">
          <button type="button" onClick={() => setTab("tokens")} disabled={tab === "tokens"}>Token purchases</button>
          <button type="button" onClick={() => setTab("withdrawals")} disabled={tab === "withdrawals"}>Seller withdrawals</button>
          <button type="button" onClick={load}>Refresh</button>
        </div>
        {message && <p className="admin-transfer-notice">{message}</p>}

        {tab === "tokens" ? (
          <div className="admin-transfer-list">
            {tokenRequests.length ? tokenRequests.map((item) => (
              <article className="admin-transfer-item" key={item.reference}>
                <div className="admin-transfer-item-heading">
                  <div><p className="section-kicker">{item.status === "pending" ? "AWAITING APPROVAL" : item.status.toUpperCase()}</p><h2>{item.reference}</h2></div>
                  <strong>{item.tokens.toLocaleString("en-NG")} tokens</strong>
                </div>
                <dl>
                  <div><dt>Account</dt><dd>{item.customer?.name || "Unknown"}</dd></div>
                  <div><dt>Email</dt><dd>{item.customer?.email || "Unknown"}</dd></div>
                  <div><dt>Payment reference</dt><dd>{item.paymentReference}</dd></div>
                  <div><dt>Submitted</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>
                </dl>
                {item.status === "pending" && (
                  <div className="admin-transfer-actions">
                    <button className="admin-approve-button" disabled={!!busy} onClick={() => reviewToken(item, "approve")}>{busy === item.reference ? "Updating…" : "Approve token purchase"}</button>
                    <button className="admin-reject-button" disabled={!!busy} onClick={() => reviewToken(item, "reject")}>{busy === item.reference ? "Updating…" : "Reject"}</button>
                  </div>
                )}
              </article>
            )) : <p className="admin-transfer-empty">No token purchase requests.</p>}
          </div>
        ) : (
          <div className="admin-transfer-list">
            {withdrawals.length ? withdrawals.map((item) => (
              <article className="admin-transfer-item" key={item.reference}>
                <div className="admin-transfer-item-heading">
                  <div><p className="section-kicker">{item.status === "pending" ? "AWAITING PAYMENT" : item.status.toUpperCase()}</p><h2>{item.reference}</h2></div>
                  <strong>₦{item.tokens.toLocaleString("en-NG")}</strong>
                </div>
                <dl>
                  <div><dt>Account name</dt><dd>{item.accountName}</dd></div>
                  <div><dt>Account number</dt><dd>{item.accountNumber}</dd></div>
                  <div><dt>Phone</dt><dd>{item.phone}</dd></div>
                  <div><dt>Submitted</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>
                </dl>
                {item.status === "pending" && (
                  <div className="admin-transfer-actions">
                    <button className="admin-approve-button" disabled={!!busy} onClick={() => reviewWithdrawal(item, "paid")}>{busy === item.reference ? "Updating…" : "Mark cash paid"}</button>
                    <button className="admin-reject-button" disabled={!!busy} onClick={() => reviewWithdrawal(item, "rejected")}>{busy === item.reference ? "Updating…" : "Reject"}</button>
                  </div>
                )}
              </article>
            )) : <p className="admin-transfer-empty">No withdrawal requests.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
