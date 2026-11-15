"use client";

import { useState } from "react";

function Brand() {
  return (
    <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
      <span className="brand-mark">r<span>.</span></span>
      <span>rsu<span className="brand-light">mart</span></span>
    </a>
  );
}

export default function ResetPasswordForm() {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not request a reset code.");
      setMessage(result.message);
      setStep("reset");
    } catch (requestError) {
      setError(requestError.message || "We couldn’t reach RSU Mart. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reset your password.");
      setCode("");
      setPassword("");
      setStep("complete");
    } catch (resetError) {
      setError(resetError.message || "We couldn’t reach RSU Mart. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar"><Brand /><a href="/login">Back to sign in <span aria-hidden="true">↗</span></a></div>
      <div className="auth-layout auth-reset-layout">
        <section className="auth-card">
          <div className="auth-card-heading">
            <p className="section-kicker">ACCOUNT RECOVERY</p>
            <h2>{step === "complete" ? "Password updated." : "Reset your password."}</h2>
            <p>{step === "request" ? "We’ll email you a one-time code to verify your account." : step === "reset" ? "Enter the code from your email and choose a new password." : "You can now sign in with your new password."}</p>
          </div>
          {step === "request" && (
            <form className="auth-form" onSubmit={requestCode}>
              <label>
                <span>Email address</span>
                <input autoComplete="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a reset code"}<span aria-hidden="true">→</span></button>
            </form>
          )}
          {step === "reset" && (
            <>
              <p className="auth-reset-message" role="status">{message}</p>
              <form className="auth-form" onSubmit={resetPassword}>
                <label>
                  <span>Six-digit code</span>
                  <input autoComplete="one-time-code" inputMode="numeric" name="code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={6} />
                </label>
                <label>
                  <span>New password</span>
                  <input autoComplete="new-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} maxLength={72} />
                  <small className="password-hint">Use at least 10 characters.</small>
                </label>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Updating…" : "Set new password"}<span aria-hidden="true">→</span></button>
              </form>
              <form className="auth-reset-resend" onSubmit={requestCode}>
                <button type="submit" disabled={busy}>Send a new code</button>
              </form>
            </>
          )}
          {step === "complete" && <a className="auth-submit auth-reset-signin" href="/login">Back to sign in<span aria-hidden="true">→</span></a>}
        </section>
      </div>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore as a guest</a></footer>
    </main>
  );
}
