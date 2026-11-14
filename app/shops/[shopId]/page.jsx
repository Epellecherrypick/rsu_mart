"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const fontOptions = {
  sans: "Arial, sans-serif",
  serif: "Georgia, serif",
  rounded: "Trebuchet MS, sans-serif",
  mono: "Courier New, monospace",
};

function money(amountKobo) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function ProductCard({ product, fontFamily }) {
  const defaultIndex = Math.max(
    0,
    product.variants.findIndex((variant) => variant.id === product.defaultVariantId),
  );
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [colorsOpen, setColorsOpen] = useState(false);
  const selected = product.variants[selectedIndex] || product.variants[0];
  const totalStock = product.variants.reduce((total, variant) => total + variant.inventory, 0);

  return (
    <article className="public-product-card" style={{ fontFamily }}>
      {selected && <img className="public-product-image" src={selected.imageUrl} alt={`${product.name} in ${selected.color}`} />}
      <div className="public-product-copy">
        <h2>{product.name}</h2>
        <strong>{money(product.priceKobo)}</strong>
        <p>{product.description}</p>
        <span className="public-product-stock">{totalStock > 0 ? `${totalStock} available` : "Out of stock"}</span>
        {product.variants.length > 1 && (
          <button
            className="product-colors-toggle"
            type="button"
            aria-expanded={colorsOpen}
            onClick={() => setColorsOpen((open) => !open)}
          >
            {colorsOpen ? "Hide colors" : `Choose color · ${selected?.color || "Options"}`}
            <span aria-hidden="true">{colorsOpen ? "−" : "+"}</span>
          </button>
        )}
        {colorsOpen && (
          <div className="public-product-colors" aria-label="Available product colors">
            {product.variants.map((variant, index) => (
              <button
                type="button"
                key={variant.id}
                className={index === selectedIndex ? "selected" : ""}
                aria-pressed={index === selectedIndex}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={variant.imageUrl} alt="" />
                <span>{variant.color}</span>
                <small>{variant.inventory > 0 ? `${variant.inventory} in stock` : "Sold out"}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function PublicShopPage() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/shops/${encodeURIComponent(shopId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load this shop.");
        if (!active) return;
        setShop(result.shop);
        setProducts(result.products);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [shopId]);

  const bannerBackground = useMemo(() => {
    if (!shop) return undefined;
    if (shop.theme?.mode === "gradient") {
      return `linear-gradient(135deg, ${shop.theme.gradientStart}, ${shop.theme.gradientEnd})`;
    }
    return shop.theme?.accentColor || "#3d5a4b";
  }, [shop]);
  const fontFamily = fontOptions[shop?.theme?.font] || fontOptions.sans;

  if (loading) {
    return <main className="public-shop-page"><p role="status">Loading shop…</p></main>;
  }
  if (error || !shop) {
    return (
      <main className="public-shop-page">
        <a href="/">← Back to the mart</a>
        <p className="auth-error" role="alert">{error || "Shop not found."}</p>
      </main>
    );
  }

  return (
    <main className="public-shop-page" style={{ fontFamily }}>
      <header className="public-shop-header">
        <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
          <span className="brand-mark">r<span>.</span></span>
          <span>rsu<span className="brand-light">mart</span></span>
        </a>
        <a href="/">Back to the mart <span aria-hidden="true">↗</span></a>
      </header>
      <section className="public-shop-banner" style={{ background: bannerBackground }}>
        {shop.bannerImage && <img src={shop.bannerImage} alt="" />}
        <div>
          <p>{shop.category}</p>
          <h1>{shop.name}</h1>
          <span>{shop.description}</span>
        </div>
      </section>
      <section className="public-shop-products">
        <div className="public-shop-heading">
          <div>
            <p className="section-kicker">SHOP THE COLLECTION</p>
            <h2>Products from {shop.name}</h2>
          </div>
          <span>{products.length} product{products.length === 1 ? "" : "s"}</span>
        </div>
        {products.length ? (
          <div className="public-products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} fontFamily={fontFamily} />
            ))}
          </div>
        ) : (
          <p className="products-empty">This shop hasn’t added products yet. Check back soon.</p>
        )}
      </section>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore other shops</a></footer>
    </main>
  );
}
