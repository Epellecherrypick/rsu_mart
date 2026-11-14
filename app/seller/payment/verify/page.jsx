"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function Brand() {
  return <a className="brand auth-brand" href="/" aria-label="RSU Mart home"><span className="brand-mark">r<span>.</span></span><span>rsu<span className="brand-light">mart</span></span></a>;
}

function formatRemaining(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function TransferInstructionsPage() {
  const router = useRouter();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [remaining, setRemaining] = useState(0);
  const reference = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("reference") || "";

  const refresh = useCallback(async () => {
    if (!reference) { setError("We couldn’t find your transfer code."); setLoading(false); return; }
    try {
      const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
      if (!response.ok) throw new Error(result.error || "Could not load transfer details.");
      setPayment(result.payment);
      setError("");
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [reference, router]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const poll = window.setInterval(refresh, 15000);
    return () => window.clearInterval(poll);
  }, [payment, refresh]);
  useEffect(() => {
    if (!payment?.expiresAt) return;
    const update = () => setRemaining(new Date(payment.expiresAt).getTime() - Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [payment?.expiresAt]);

  async function copy(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(""), 1800);
    } catch { setError("Copy didn’t work here. Press and hold the value to copy it."); }
  }

  const status = payment?.status;
  const expired = status === "expired" || (status === "pending" && remaining <= 0);
  const approved = status === "paid";
  const rejected = status === "rejected";

  return <main className="payment-result-page">
    <header className="seller-topbar"><Brand /><a href="/seller">Seller dashboard</a></header>
    <section className="transfer-card" aria-live="polite">
      <p className="section-kicker">SELLER ONBOARDING · ₦5,000</p>
      <h1>{loading ? "Loading your transfer…" : approved ? "Transfer approved." : expired ? "This code has expired." : rejected ? "Transfer needs attention." : "Make your bank transfer."}</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {payment && <>
        {approved ? <p className="transfer-status-note">Your payment was approved by the RSU Mart team. You can continue to create your shop.</p>
          : rejected ? <p className="transfer-status-note">The admin could not match this transfer. Start a new request or contact support.</p>
          : expired ? <p className="transfer-status-note">This code is no longer valid. Transfers received after expiry cannot be approved with this code.</p>
          : <p className="transfer-status-note">Transfer from any Nigerian bank app. Put the code below in the narration or payment reference so we can match it to your account.</p>}

        {!approved && !expired && !rejected && <>
          <div className="transfer-countdown"><span>CODE EXPIRES IN</span><strong>{formatRemaining(remaining)}</strong></div>
          <div className="transfer-details">
            <div><span>Bank / app</span><strong>{payment.transferDetails?.bankName}</strong></div>
            <div><span>Account name</span><strong>{payment.transferDetails?.accountName}</strong></div>
            <div className="transfer-copy-row"><span>Account number</span><strong>{payment.transferDetails?.accountNumber}</strong><button type="button" onClick={() => copy(payment.transferDetails.accountNumber, "account")}>{copied === "account" ? "Copied" : "Copy"}</button></div>
            <div className="transfer-copy-row transfer-code-row"><span>Transfer narration / code</span><strong>{payment.reference}</strong><button type="button" onClick={() => copy(payment.reference, "code")}>{copied === "code" ? "Copied" : "Copy code"}</button></div>
            <div><span>Exact amount</span><strong>₦{(payment.amount / 100).toLocaleString("en-NG")}</strong></div>
          </div>
          <p className="transfer-review-note">After sending, keep this page open. Our admin checks the transfer and approves seller access; this code alone does not confirm payment.</p>
        </>}

        {approved ? <button className="payment-button" onClick={() => router.replace("/seller/shop")}>Continue to shop setup <span aria-hidden="true">→</span></button>
          : expired || rejected ? <button className="payment-button" onClick={() => router.replace("/seller")}>Back to seller dashboard <span aria-hidden="true">→</span></button>
          : <button className="payment-button" onClick={refresh} disabled={loading}>{loading ? "Checking…" : "Check approval status"}<span aria-hidden="true">↻</span></button>}
      </>}
    </section>
    <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore the mart</a></footer>
  </main>;
}
