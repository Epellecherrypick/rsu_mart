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
  const isPaid = user.sellerStatus === "paid";
  const isTestSeller = user.sellerTestMode === true;
  const canUseFreeDevActivation = process.env.NODE_ENV === "development";

  async function beginPayment() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: "{}",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "We couldn’t start the payment. Please try again.");
        return;
      }

      window.location.assign(result.authorizationUrl);
    } catch {
      setError("We couldn’t reach the payment provider. Please try again.");
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
        <div><a href="/">← Back to the mart</a><button onClick={signOut}>Sign out</button></div>
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
                ? "Your ₦5,000 onboarding payment has been verified. Your account is ready for shop setup."
              : "Pay securely through OPay to unlock seller onboarding. You’ll be redirected to OPay’s hosted checkout; RSU Mart never sees or stores your card details."}</p>
            {!isPaid && (
              <div className="seller-payment-summary">
                <span>Seller onboarding <small>One-time payment</small></span>
                <strong>₦5,000</strong>
              </div>
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
                  {busy ? "Connecting to OPay…" : <>Continue to secure payment <span aria-hidden="true">↗</span></>}
                </button>
                <small className="seller-secure-note"><span>🔒</span> Secure checkout by OPay · NGN · ₦5,000</small>
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
            <span className={isPaid ? "done" : ""}><i>{isPaid ? "✓" : "01"}</i> {isTestSeller ? "Free development test access" : "Secure onboarding payment"}</span>
            <span><i>02</i> Set up your shop & categories</span>
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
