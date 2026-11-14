"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function Brand() {
  return <a className="brand auth-brand" href="/" aria-label="RSU Mart home"><span className="brand-mark">r<span>.</span></span><span>rsu<span className="brand-light">mart</span></span></a>;
}

export default function AdminTransferQueue() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/transfers", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load transfer requests.");
      setPayments(result.payments || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => !query || `${payment.reference} ${payment.customer?.name || ""} ${payment.customer?.email || ""}`.toLowerCase().includes(query));
  }, [payments, search]);

  async function review(payment, action) {
    const isExpired = payment.status === "expired";
    if (isExpired) return;
    if (action === "approve" && !window.confirm(`Confirm that ₦5,000 arrived in ${payment.transferDetails?.accountName} and the transfer narration matches ${payment.reference}?`)) return;
    setBusyCode(payment.reference);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/transfers", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: payment.reference, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update this transfer.");
      setNotice(action === "approve" ? "Transfer approved. Seller access and shop setup are now unlocked." : "Transfer request rejected.");
      await refresh();
    } catch (reviewError) { setError(reviewError.message); }
    finally { setBusyCode(""); }
  }

  return <main className="auth-page">
    <div className="auth-topbar"><Brand /><a href="/">Back to the mart <span>↗</span></a></div>
    <div className="admin-transfer-wrap">
      <p className="section-kicker">RSU MART · ADMIN</p>
      <h1>Seller transfer approvals</h1>
      <p className="admin-transfer-intro">Match the code and amount against the deposit in your bank app before approving. An expired code cannot be approved.</p>
      <div className="admin-transfer-toolbar">
        <input aria-label="Search transfer code or seller" placeholder="Search code, name, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="button" onClick={refresh} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="admin-transfer-notice" role="status">{notice}</p>}
      {loading ? <p role="status">Loading transfer requests…</p> : filtered.length ? <div className="admin-transfer-list">
        {filtered.map((payment) => <article className="admin-transfer-item" key={payment.reference}>
          <div className="admin-transfer-item-heading"><div><p className="section-kicker">{payment.status === "pending" ? "AWAITING REVIEW" : "EXPIRED"}</p><h2>{payment.reference}</h2></div><strong>₦{(payment.amount / 100).toLocaleString("en-NG")}</strong></div>
          <dl>
            <div><dt>Seller</dt><dd>{payment.customer?.name || "Unknown account"}</dd></div>
            <div><dt>Email</dt><dd>{payment.customer?.email || "No email"}</dd></div>
            <div><dt>Transfer to</dt><dd>{payment.transferDetails?.bankName} · {payment.transferDetails?.accountName} · {payment.transferDetails?.accountNumber}</dd></div>
            <div><dt>Started</dt><dd>{new Date(payment.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div><dt>Code expires</dt><dd>{new Date(payment.expiresAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
          </dl>
          {payment.status === "pending" && <div className="admin-transfer-actions">
            <button type="button" className="admin-approve-button" onClick={() => review(payment, "approve")} disabled={busyCode === payment.reference}>{busyCode === payment.reference ? "Updating…" : "Approve transfer"}</button>
            <button type="button" className="admin-reject-button" onClick={() => review(payment, "reject")} disabled={busyCode === payment.reference}>{busyCode === payment.reference ? "Updating…" : "Reject"}</button>
          </div>}
        </article>)}
      </div> : <div className="admin-transfer-empty"><h2>No matching transfer requests.</h2><p>New seller payments will show here until the two-hour code expires.</p></div>}
    </div>
    <footer className="auth-footer"><span>© RSU Mart</span><span>Admin tools</span><a href="/seller">Seller dashboard</a></footer>
  </main>;
}
