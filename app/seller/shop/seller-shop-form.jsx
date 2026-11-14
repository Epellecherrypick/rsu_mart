"use client";

import { useEffect, useMemo, useState } from "react";

const serviceTypes = [
  "Food & drinks",
  "Fashion",
  "Accessories",
  "Gadgets",
  "Beauty",
  "Other services",
];
const fontOptions = {
  sans: "Arial, sans-serif",
  serif: "Georgia, serif",
  rounded: "Trebuchet MS, sans-serif",
  mono: "Courier New, monospace",
};
const emptyShop = {
  name: "",
  category: serviceTypes[0],
  description: "",
  bannerImage: "",
  theme: {
    mode: "gradient",
    accentColor: "#3d5a4b",
    gradientStart: "#3d5a4b",
    gradientEnd: "#92a988",
    font: "sans",
  },
};

function Brand() {
  return (
    <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
      <span className="brand-mark">r<span>.</span></span>
      <span>rsu<span className="brand-light">mart</span></span>
    </a>
  );
}

export default function SellerShopForm() {
  const [shop, setShop] = useState(emptyShop);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/seller/shop", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load your shop.");
        if (!active || !result.shop) return;
        const saved = result.shop;
        setShop({
          name: saved.name || "",
          category: serviceTypes.includes(saved.category) ? saved.category : "Other services",
          description: saved.description || "",
          bannerImage: saved.bannerImage || "",
          theme: { ...emptyShop.theme, ...saved.theme },
        });
        setExists(true);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const bannerBackground = useMemo(
    () => shop.theme.mode === "gradient"
      ? `linear-gradient(135deg, ${shop.theme.gradientStart}, ${shop.theme.gradientEnd})`
      : shop.theme.accentColor,
    [shop.theme],
  );

  function updateField(key, value) {
    setShop((current) => ({ ...current, [key]: value }));
  }

  function updateTheme(key, value) {
    setShop((current) => ({
      ...current,
      theme: { ...current.theme, [key]: value },
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/seller/shop", {
        method: exists ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shop),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your shop.");
      setExists(true);
      setMessage("Your shop details are saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page shop-setup-page">
      <div className="auth-topbar">
        <Brand />
        <a href="/seller">Back to seller dashboard <span aria-hidden="true">↗</span></a>
      </div>
      <div className="shop-setup-wrap">
        <p className="section-kicker">YOUR SHOP, YOUR STYLE</p>
        <h1>{exists ? "Make it feel like yours." : "Let’s set up your shop."}</h1>
        <p className="shop-setup-intro">
          Every seller gets one shop. Choose what you offer and shape a look that feels like your business.
        </p>

        <div className="shop-setup-layout">
          <form className="shop-setup-form" onSubmit={save}>
            <label className="shop-field">
              <span>Shop name</span>
              <input value={shop.name} onChange={(event) => updateField("name", event.target.value)} required minLength={2} maxLength={80} placeholder="e.g. The Daily Drip" />
            </label>
            <label className="shop-field">
              <span>What service do you provide?</span>
              <select value={shop.category} onChange={(event) => updateField("category", event.target.value)}>
                {serviceTypes.map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
            <label className="shop-field">
              <span>About your shop</span>
              <textarea value={shop.description} onChange={(event) => updateField("description", event.target.value)} required minLength={10} maxLength={500} placeholder="Tell customers what makes your shop special." rows={4} />
              <small>{shop.description.length}/500 characters</small>
            </label>
            <label className="shop-field">
              <span>Banner image URL <small>Optional</small></span>
              <input type="url" value={shop.bannerImage} onChange={(event) => updateField("bannerImage", event.target.value)} maxLength={2048} placeholder="https://example.com/your-banner.jpg" />
              <small>Paste a public HTTPS image link. Image uploads can be added later.</small>
            </label>

            <fieldset className="shop-theme-fields">
              <legend>Brand colors</legend>
              <p>Use the color wheels to pick a signature color or create your own gradient.</p>
              <label className="shop-color-field">
                <span>Accent color</span>
                <input type="color" value={shop.theme.accentColor} onChange={(event) => updateTheme("accentColor", event.target.value)} />
                <code>{shop.theme.accentColor}</code>
              </label>
              <label className="shop-field">
                <span>Banner background</span>
                <select value={shop.theme.mode} onChange={(event) => updateTheme("mode", event.target.value)}>
                  <option value="gradient">Gradient</option>
                  <option value="solid">Solid color</option>
                </select>
              </label>
              {shop.theme.mode === "gradient" && (
                <div className="shop-color-pair">
                  <label className="shop-color-field">
                    <span>Gradient start</span>
                    <input type="color" value={shop.theme.gradientStart} onChange={(event) => updateTheme("gradientStart", event.target.value)} />
                    <code>{shop.theme.gradientStart}</code>
                  </label>
                  <label className="shop-color-field">
                    <span>Gradient end</span>
                    <input type="color" value={shop.theme.gradientEnd} onChange={(event) => updateTheme("gradientEnd", event.target.value)} />
                    <code>{shop.theme.gradientEnd}</code>
                  </label>
                </div>
              )}
              <label className="shop-field">
                <span>Shop font</span>
                <select value={shop.theme.font} onChange={(event) => updateTheme("font", event.target.value)}>
                  <option value="sans">Clean</option>
                  <option value="serif">Editorial</option>
                  <option value="rounded">Friendly</option>
                  <option value="mono">Modern</option>
                </select>
              </label>
            </fieldset>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="shop-save-message" role="status">{message}</p>}
            <button className="auth-submit" type="submit" disabled={busy || loading}>
              {busy ? "Saving…" : exists ? "Save shop changes" : "Create my shop"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
            {exists && (
              <>
                <p className="shop-one-only-note">You can edit your shop, but each seller can have only one.</p>
                <a className="products-manage-link" href="/seller/products">Manage your products →</a>
              </>
            )}
          </form>

          <aside className="shop-preview" aria-label="Live shop preview">
            <p className="section-kicker">LIVE PREVIEW</p>
            <article className="shop-preview-card" style={{ fontFamily: fontOptions[shop.theme.font] }}>
              <div className="shop-preview-banner" style={{ background: bannerBackground }}>
                {shop.bannerImage && <img src={shop.bannerImage} alt="" />}
                <span className="shop-preview-mark" style={{ color: shop.theme.accentColor }}>r.</span>
              </div>
              <div className="shop-preview-copy">
                <p style={{ color: shop.theme.accentColor }}>{shop.category}</p>
                <h2>{shop.name || "Your shop name"}</h2>
                <span>{shop.description || "Your shop description will appear here."}</span>
              </div>
            </article>
            <p className="shop-preview-hint">Your banner and brand style will appear on your shop card.</p>
          </aside>
        </div>
      </div>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span></footer>
    </main>
  );
}
