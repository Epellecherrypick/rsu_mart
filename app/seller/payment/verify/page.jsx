"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function Brand() {
  return (
    <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
      <span className="brand-mark">r<span>.</span></span>
      <span>rsu<span className="brand-light">mart</span></span>
    </a>
  );
}

export default function PaymentVerificationPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) {
      setStatus("error");
      setMessage("We couldn’t find a payment reference. Return to seller onboarding to try again.");
      return;
    }

    let active = true;
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          const currentPath = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
          return;
        }
        if (!response.ok) throw new Error(result.error || "We couldn’t verify your payment.");
        if (active) setStatus("paid");
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          setMessage(error.message);
        }
      });

    return () => { active = false; };
  }, [router]);

  return (
    <main className="payment-result-page">
      <header className="seller-topbar">
        <Brand />
        <a href="/seller">Back to seller onboarding</a>
      </header>
      <section className="payment-result-card" aria-live="polite">
        <div className={`payment-result-icon ${status}`}>{status === "checking" ? "…" : status === "paid" ? "✓" : "!"}</div>
        <p className="section-kicker">{status === "paid" ? "PAYMENT VERIFIED" : status === "checking" ? "SECURELY CONFIRMING" : "PAYMENT NOT CONFIRMED"}</p>
        <h1>{status === "paid" ? "You’re all set." : status === "checking" ? "One moment, please." : "Let’s double-check."}</h1>
        <p>{status === "paid"
          ? "Your ₦5,000 seller onboarding payment is confirmed. Your seller access is ready."
          : status === "checking"
            ? "We’re checking the transaction directly with OPay. Please don’t close this page."
            : message}</p>
        {status === "paid" ? (
          <button className="payment-button" onClick={() => router.replace("/seller")}>Continue to seller onboarding <span aria-hidden="true">→</span></button>
        ) : status === "error" ? (
          <button className="payment-button" onClick={() => router.replace("/seller")}>Return to seller onboarding <span aria-hidden="true">→</span></button>
        ) : (
          <span className="payment-security-note"><i /> Your payment details are handled by OPay.</span>
        )}
      </section>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore the mart</a></footer>
    </main>
  );
}
