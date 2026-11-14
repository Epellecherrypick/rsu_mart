"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetupForm() {
  const router = useRouter();
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/activate", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not activate admin access.");
      router.replace("/admin/transfers");
      router.refresh();
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <div className="auth-topbar"><a className="brand auth-brand" href="/"><span className="brand-mark">r<span>.</span></span><span>rsu<span className="brand-light">mart</span></span></a><a href="/">Back to the mart <span>↗</span></a></div>
    <section className="admin-setup-card">
      <p className="section-kicker">RESTRICTED ADMIN SETUP</p>
      <h1>Enable transfer approvals</h1>
      <p>Enter the private setup code configured for the allowlisted admin account. This is a one-time step for this account.</p>
      <form className="auth-form" onSubmit={submit}>
        <label><span>Private setup code</span><input type="password" autoComplete="off" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} required maxLength={256} /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Checking…" : "Enable admin access"}<span>→</span></button>
      </form>
    </section>
  </main>;
}
