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

export default function LoginForm({ nextPath }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSetupToken, setAdminSetupToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (mode === "register" && password.length < 10) {
      setError("Choose a password with at least 10 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name } : {}),
          ...(mode === "register" && adminSetupToken ? { adminSetupToken } : {}),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "We couldn’t sign you in. Please try again.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("We couldn’t reach RSU Mart. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Brand />
        <a href="/">Back to the mart <span aria-hidden="true">↗</span></a>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="auth-story-art" aria-hidden="true">
            <span className="auth-orbit orbit-a" />
            <span className="auth-orbit orbit-b" />
            <span className="auth-story-mark">r<span>.</span></span>
            <span className="auth-floating auth-float-one">✳</span>
            <span className="auth-floating auth-float-two">↗</span>
          </div>
          <p className="section-kicker">GOOD FINDS, CLOSE BY</p>
          <h1>Your neighbourhood<br />looks good on you.</h1>
          <p>One little account brings you closer to the shops, food, and people that make campus feel like home.</p>
          <div className="auth-story-caption"><span><i /> THE RSU COMMUNITY</span><span>Made for around here.</span></div>
        </section>

        <section className="auth-card">
          <div className="auth-card-heading">
            <p className="section-kicker">{mode === "login" ? "GOOD TO SEE YOU AGAIN" : "WELCOME TO YOUR NEIGHBOURHOOD"}</p>
            <h2>{mode === "login" ? "Come on in." : "Let’s get you settled."}</h2>
            <p>{mode === "login" ? "Sign in to pick up where you left off." : "Create one account for all your campus finds."}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }} disabled={busy}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }} disabled={busy}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <label>
                <span>Your name</span>
                <input autoComplete="name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" required minLength={2} maxLength={80} />
              </label>
            )}
            <label>
              <span>Email address</span>
              <input autoComplete="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} />
            </label>
            {mode === "register" && (
              <details className="auth-admin-setup">
                <summary>Site admin account setup</summary>
                <label>
                  <span>Private setup code <small>Only for the allowlisted site admin</small></span>
                  <input autoComplete="off" name="adminSetupToken" type="password" value={adminSetupToken} onChange={(event) => setAdminSetupToken(event.target.value)} placeholder="Provided by the site owner" maxLength={256} />
                </label>
              </details>
            )}
            <label>
              <span>Password</span>
              <input autoComplete={mode === "register" ? "new-password" : "current-password"} name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 10 characters" : "Your password"} required minLength={mode === "register" ? 10 : 1} maxLength={72} />
              {mode === "register" && <small className="password-hint">Use at least 10 characters to keep your account safe.</small>}
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create my account"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          {mode === "login" && <a className="auth-forgot-link" href="/forgot-password">Forgot your password?</a>}
          <p className="auth-note"><span>🔒</span> Your details stay safe. We never store your payment card details.</p>
        </section>
      </div>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore as a guest</a></footer>
    </main>
  );
}
