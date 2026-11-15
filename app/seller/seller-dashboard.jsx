"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Brand() {
  return (
    <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
      <span className="brand-mark">r<span>.</span></span>
      <span>rsu<span className="brand-light">mart</span></span>
    </a>
  );
}

export default function SellerDashboard({ user }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [senderAccountName, setSenderAccountName] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const isPaid = user.sellerStatus === "paid";
  const isTestSeller = user.sellerTestMode === true;
  const canUseFreeDevActivation = process.env.NODE_ENV === "development";

  async function beginPayment() {
    const accountName = senderAccountName.trim();
    const accountNumber = senderAccountNumber.trim();
    if (accountName.length < 2 || accountName.length > 80) {
      setError("Enter the account name you’ll transfer from.");
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setError("Enter the 10-digit account number you’ll transfer from.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ senderAccountName: accountName, senderAccountNumber: accountNumber }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("RSU Mart returned an unexpected response. Please try again shortly.");
      }

      if (!response.ok) {
        setError(result.error || "We couldn’t start the payment. Please try again.");
        return;
      }

      router.push(`/seller/payment/verify?reference=${encodeURIComponent(result.payment.reference)}`);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? "We couldn’t connect to RSU Mart. No bank transfer was started. Please try again shortly."
        : requestError.message || "We couldn’t prepare your transfer details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function activateTestSeller() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seller/dev-activate", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not activate the test seller account.");
        return;
      }

      router.refresh();
    } catch {
      setError("We couldn’t activate the test seller account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="seller-page">
      <header className="seller-topbar">
        <Brand />
        <div>{user.isAdmin && <a href="/admin/transfers">Admin transfers</a>}<a href="/">← Back to the mart</a><button onClick={signOut}>Sign out</button></div>
      </header>
      <section className="seller-dashboard">
        <div className="seller-welcome">
          <p className="section-kicker">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>{isPaid ? "You’re in the neighbourhood." : "Let’s make room for your shop."}</h1>
          <p>Welcome, {user.name}. Bring your business to the students and neighbours looking for their next favourite.</p>
        </div>
        <div className="seller-step-card">
          <div className={`seller-step-icon ${isPaid ? "complete" : ""}`}>{isPaid ? "✓" : "01"}</div>
          <div className="seller-step-content">
            <p className="section-kicker">{isTestSeller ? "TEST SELLER ACTIVE" : isPaid ? "PAYMENT CONFIRMED" : "ONE-TIME SELLER ONBOARDING"}</p>
            <h2>{isPaid ? "Your seller access is active." : "A little setup. A lot of possibilities."}</h2>
            <p>{isTestSeller
              ? "Free development test access is enabled. No payment was made; this account is for testing seller features."
              : isPaid
                ? "Your ₦5,000 seller onboarding transfer has been approved. Your account is ready for shop setup."
              : "Transfer ₦5,000 from any Nigerian bank app to the RSU Mart account. Your unique transfer code helps us match it; seller access opens after admin approval."}</p>
            {!isPaid && (
              <>
                <div className="seller-payment-summary">
                  <span>Seller onboarding <small>One-time payment</small></span>
                  <strong>₦5,000</strong>
                </div>
                <div className="seller-transfer-sender">
                  <p>Transfer from</p>
                  <label>Account name<input autoComplete="name" value={senderAccountName} onChange={(event) => setSenderAccountName(event.target.value)} maxLength={80} required /></label>
                  <label>Account number<input inputMode="numeric" autoComplete="off" value={senderAccountNumber} onChange={(event) => setSenderAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} minLength={10} required /></label>
                  <small>We share these details and your RSU Mart profile only with admins to match your transfer.</small>
                </div>
              </>
            )}
            {error && <p className="seller-payment-error" role="alert">{error}</p>}
            {isPaid ? (
              <div className="seller-next-step">
                <span>✓</span>
                {isTestSeller ? "Test seller access is active." : "Seller access is active."}
                <a href="/seller/shop">Set up / manage your shop →</a>
              </div>
            ) : (
              <>
                <button className="payment-button" onClick={beginPayment} disabled={busy}>
                  {busy ? "Preparing transfer details…" : <>Get transfer instructions <span aria-hidden="true">→</span></>}
                </button>
                <small className="seller-secure-note"><span>◷</span> One-time ₦5,000 transfer · code valid for 2 hours</small>
                {canUseFreeDevActivation && (
                  <button
                    className="seller-dev-activate"
                    type="button"
                    onClick={activateTestSeller}
                    disabled={busy}
                  >
                    {busy ? "Activating test seller…" : "Activate free test seller (development only)"}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="seller-checklist">
            <p>WHAT HAPPENS NEXT</p>
            <span className={isPaid ? "done" : ""}><i>{isPaid ? "✓" : "01"}</i> {isTestSeller ? "Free development test access" : "Bank transfer + admin approval"}</span>
            <span><i>{isPaid ? "✓" : "02"}</i> Set up your shop & categories</span>
            <span><i>03</i> Add products and opening hours</span>
            <span><i>04</i> Start receiving orders</span>
          </div>
        </div>
        <p className="seller-help">Need a hand? <a href="mailto:support@rsumart.com">Contact the RSU Mart team</a></p>
      </section>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Built for businesses around RSU.</span><a href="/">Back to the mart</a></footer>
    </main>
  );
}


