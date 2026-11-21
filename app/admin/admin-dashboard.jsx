"use client";

import AdminNav from "./admin-nav";

export default function AdminDashboard({ summary }) {
  const cards = [
    { href: "/admin/sellers", title: "Seller account purchases", count: summary.pendingSellerTransfers, copy: "Approve seller onboarding purchases and activate approved accounts.", action: "Open seller approvals" },
    { href: "/admin/finance", title: "Token purchase requests & withdrawals", count: summary.pendingTokenRequests + summary.pendingWithdrawals, copy: `${summary.pendingTokenRequests} token requests · ${summary.pendingWithdrawals} withdrawals awaiting review.`, action: "Open token requests" },
    { href: "/admin/reports", title: "Reports & monitoring", count: summary.flaggedAccounts + summary.securityEvents, copy: "Review reports, logged events, flagged accounts, crawlers, and rate limits.", action: "Open reports" },
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
      <AdminNav active="/admin" />
      <div className="admin-transfer-wrap">
        <p className="section-kicker">RSU MART · ADMIN CONTROL PANEL</p>
        <h1>Three admin dashboards</h1>
        <p className="admin-transfer-intro">
          Review pending account activity and confirm real-money transfers before any token or seller state changes.
        </p>
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
