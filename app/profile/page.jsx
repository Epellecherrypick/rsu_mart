"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const categories = ["Food & drinks", "Fashion", "Accessories", "Gadgets", "Beauty", "Other services"];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("RSU campus");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { router.replace("/login?next=%2Fprofile"); return; }
        const result = await response.json();
        if (!response.ok) throw new Error("Could not load your profile.");
        if (!active) return;
        setUser(result.user);
        setName(result.user.name || "");
        setLocation(result.user.preferences?.campusLocation || "RSU campus");
        setSelected(result.user.preferences?.categories || []);
      })
      .catch(() => { if (active) setMessage("We couldn’t load your profile. Refresh and try again."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [router]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, preferences: { categories: selected, campusLocation: location } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your profile.");
      setUser(result.user);
      setMessage("Your profile is saved.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <div className="auth-topbar"><a className="brand auth-brand" href="/"><span className="brand-mark">r<span>.</span></span><span>rsu<span className="brand-light">mart</span></span></a><a href="/">Back to the mart <span>↗</span></a></div>
    <div className="profile-wrap">
      <p className="section-kicker">YOUR RSU MART ACCOUNT</p>
      <h1>Your profile</h1>
      <p><a href="/tokens">Open token wallet →</a></p>
      <p className="profile-intro">Set up your details and tell us what you like. We’ll use your picks to make shop discovery feel more relevant.</p>
      {busy && !user ? <p role="status">Loading your profile…</p> : !user ? <p className="profile-message" role="alert">Sign in to view and update your profile.</p> : <form className="profile-card" onSubmit={save}>
        <label className="profile-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} /></label>
        <label className="profile-field"><span>Email address</span><input value={user?.email || ""} readOnly /></label>
        <label className="profile-field"><span>Campus delivery area</span><input value={location} onChange={(event) => setLocation(event.target.value)} required minLength={2} maxLength={80} placeholder="RSU campus" /></label>
        <fieldset className="profile-preferences"><legend>What do you like to shop?</legend><p>Choose as many as you like. You can change these any time.</p>
          <div>{categories.map((category) => <label key={category}><input type="checkbox" checked={selected.includes(category)} onChange={() => setSelected((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category])} /><span>{category}</span></label>)}</div>
        </fieldset>
        {message && <p className="profile-message" role="status">{message}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}<span>→</span></button>
      </form>}
      <p className="profile-back"><a href="/">← Keep exploring the mart</a></p>
    </div>
    <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span></footer>
  </main>;
}
