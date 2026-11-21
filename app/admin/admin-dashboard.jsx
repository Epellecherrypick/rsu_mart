"use client";

import { useState } from "react";

export default function AdminDashboard({ summary }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reconcile() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/tokens/reconcile", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not run reconciliation.");
      setMessage(`Reconciliation complete: ${result.reconciled} reconciled, ${result.flagged} flagged.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    { href: "/admin/tokens", title: "Token purchases", count: summary.pendingTokenRequests, copy: "Approve or reject real-money token purchases.", action: "Review tokens" },
    { href: "/admin/withdrawals", title: "Seller withdrawals", count: summary.pendingWithdrawals, copy: "Send cash and mark seller withdrawals paid.", action: "Review withdrawals" },
    { href: "/admin/transfers", title: "Seller onboarding", count: summary.pendingSellerTransfers, copy: "Approve or reject seller onboarding transfers.", action: "Review seller transfers" },
    { href: "/admin/security", title: "Security events", count: summary.securityEvents, copy: "Review crawling, rate limits, flags, and reconciliation events.", action: "Open security log" },
  ];

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
          <span className="brand-mark">r<span>.</span></span>
          <span>rsu<span className="brand-light">mart</span></span>
        </a>
        <a href="/">Back to the mart <span aria-hidden="true">↗</span></a>
      </div>
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN CONTROL PANEL</p>
        <h1>Approvals and monitoring</h1>
        <p className="admin-transfer-intro">
          Review pending account activity and confirm real-money transfers before any token or seller state changes.
        </p>
        <div className="admin-transfer-toolbar">
          <button type="button" onClick={reconcile} disabled={busy}>
            {busy ? "Checking purchases…" : "Run 30-minute purchase reconciliation"}
          </button>
        </div>
        {message && <p className="admin-transfer-notice" role="status">{message}</p>}
        <div className="admin-transfer-list">
          {cards.map((card) => (
            <article className="admin-transfer-item" key={card.href}>
              <div className="admin-transfer-item-heading">
                <div>
                  <p className="section-kicker">ADMIN QUEUE</p>
                  <h2>{card.title}</h2>
                </div>
                <strong>{card.count}</strong>
              </div>
              <p>{card.copy}</p>
              <div className="admin-transfer-actions">
                <a className="admin-approve-button" href={card.href}>{card.action}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
      <footer className="auth-footer">
        <span>© RSU Mart</span>
        <span>Admin tools</span>
        <a href="/seller">Seller dashboard</a>
      </footer>
    </main>
  );
}
