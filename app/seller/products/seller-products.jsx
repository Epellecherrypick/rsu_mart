"use client";

import { useEffect, useState } from "react";

const blankVariant = () => ({ color: "", imageUrl: "", inventory: "0" });

function Brand() {
  return (
    <a className="brand auth-brand" href="/" aria-label="RSU Mart home">
      <span className="brand-mark">r<span>.</span></span>
      <span>rsu<span className="brand-light">mart</span></span>
    </a>
  );
}

function productToForm(product) {
  return {
    name: product.name,
    description: product.description,
    price: (product.priceKobo / 100).toFixed(2),
    variants: product.variants.map((variant) => ({
      color: variant.color,
      imageUrl: variant.imageUrl,
      inventory: String(variant.inventory),
    })),
    defaultVariantIndex: Math.max(
      0,
      product.variants.findIndex((variant) => variant.id === product.defaultVariantId),
    ),
  };
}

export default function SellerProducts({ shopId, shopName }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    variants: [blankVariant()],
    defaultVariantIndex: 0,
  });

  async function loadProducts() {
    setError("");
    try {
      const response = await fetch("/api/seller/products", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load products.");
      setProducts(result.products);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      variants: [blankVariant()],
      defaultVariantIndex: 0,
    });
  }

  function startEditing(product) {
    setEditingId(product.id);
    setForm(productToForm(product));
    setNotice("");
    setError("");
  }

  function updateVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    }));
  }

  function removeVariant(index) {
    setForm((current) => {
      const variants = current.variants.filter((_, variantIndex) => variantIndex !== index);
      return {
        ...current,
        variants,
        defaultVariantIndex: current.defaultVariantIndex === index
          ? 0
          : current.defaultVariantIndex > index
            ? current.defaultVariantIndex - 1
            : current.defaultVariantIndex,
      };
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const price = Number(form.price);
      const payload = {
        name: form.name,
        description: form.description,
        priceKobo: Math.round(price * 100),
        variants: form.variants.map((variant) => ({
          color: variant.color,
          imageUrl: variant.imageUrl,
          inventory: Number(variant.inventory),
        })),
        defaultVariantIndex: form.defaultVariantIndex,
      };
      const response = await fetch(
        editingId ? `/api/seller/products/${encodeURIComponent(editingId)}` : "/api/seller/products",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save product.");
      if (editingId) {
        setProducts((current) => current.map((product) => product.id === editingId ? result.product : product));
      } else {
        setProducts((current) => [result.product, ...current]);
      }
      setNotice(editingId ? "Product updated." : "Product added to your shop.");
      resetForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Remove "${product.name}" from your shop?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/seller/products/${encodeURIComponent(product.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove product.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingId === product.id) resetForm();
      setNotice("Product removed.");
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  return (
    <main className="auth-page products-page">
      <div className="auth-topbar">
        <Brand />
        <a href={`/shops/${encodeURIComponent(shopId)}`}>View my shop <span aria-hidden="true">↗</span></a>
      </div>
      <div className="products-wrap">
        <div className="products-heading">
          <div>
            <p className="section-kicker">YOUR SHOP</p>
            <h1>{shopName}</h1>
            <p>Add products, track stock, and manage each color option from here.</p>
          </div>
          <a className="products-edit-shop" href="/seller/shop">Edit shop style</a>
        </div>

        <div className="products-layout">
          <section className="seller-product-list" aria-labelledby="product-list-title">
            <div className="products-section-heading">
              <h2 id="product-list-title">Your products</h2>
              <span>{products.length}</span>
            </div>
            {loading ? <p role="status">Loading products…</p> : products.length === 0 ? (
              <p className="products-empty">No products yet. Add your first product using the form.</p>
            ) : (
              <div className="seller-products-grid">
                {products.map((product) => {
                  const defaultVariant = product.variants.find((variant) => variant.id === product.defaultVariantId) || product.variants[0];
                  const totalInventory = product.variants.reduce((total, variant) => total + variant.inventory, 0);
                  return (
                    <article className="seller-product-card" key={product.id}>
                      {defaultVariant && <img src={defaultVariant.imageUrl} alt={`${product.name} in ${defaultVariant.color}`} />}
                      <div className="seller-product-card-copy">
                        <h3>{product.name}</h3>
                        <p>₦{(product.priceKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
                        <small>{product.variants.length} color{product.variants.length === 1 ? "" : "s"} · {totalInventory} in stock</small>
                        <div>
                          <button type="button" onClick={() => startEditing(product)}>Edit</button>
                          <button type="button" onClick={() => removeProduct(product)}>Remove</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <form className="product-editor" onSubmit={saveProduct}>
            <div className="products-section-heading">
              <h2>{editingId ? "Edit product" : "Add a product"}</h2>
              {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
            </div>
            <label className="shop-field">
              <span>Product name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required minLength={2} maxLength={100} placeholder="e.g. Everyday tote bag" />
            </label>
            <label className="shop-field">
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required minLength={5} maxLength={1000} rows={3} placeholder="Describe the product." />
            </label>
            <label className="shop-field">
              <span>Price (NGN)</span>
              <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required min="0.01" max="1000000" step="0.01" placeholder="0.00" />
            </label>

            <fieldset className="product-variants-fieldset">
              <legend>Colors and inventory</legend>
              <p>Each color has its own photo and stock count. Customers see the default color first.</p>
              {form.variants.map((variant, index) => (
                <div className="product-variant-editor" key={index}>
                  <div className="product-variant-heading">
                    <strong>Color option {index + 1}</strong>
                    {form.variants.length > 1 && <button type="button" onClick={() => removeVariant(index)}>Remove</button>}
                  </div>
                  <label className="shop-field">
                    <span>Color name</span>
                    <input value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} required maxLength={40} placeholder="e.g. Forest green" />
                  </label>
                  <label className="shop-field">
                    <span>Photo URL</span>
                    <input type="url" value={variant.imageUrl} onChange={(event) => updateVariant(index, "imageUrl", event.target.value)} required maxLength={2048} placeholder="https://example.com/product-photo.jpg" />
                  </label>
                  <label className="shop-field">
                    <span>Inventory</span>
                    <input type="number" value={variant.inventory} onChange={(event) => updateVariant(index, "inventory", event.target.value)} required min="0" max="1000000" step="1" />
                  </label>
                  <label className="default-variant-choice">
                    <input type="radio" name="defaultVariant" checked={form.defaultVariantIndex === index} onChange={() => setForm((current) => ({ ...current, defaultVariantIndex: index }))} />
                    <span>Show this color by default</span>
                  </label>
                </div>
              ))}
              <button
                className="add-variant-button"
                type="button"
                onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, blankVariant()] }))}
                disabled={form.variants.length >= 12}
              >
                + Add another color
              </button>
            </fieldset>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="shop-save-message" role="status">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy || loading}>
              {busy ? "Saving…" : editingId ? "Save product" : "Add product"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </div>
      </div>
      <footer className="auth-footer"><span>© RSU Mart</span><span>Good finds. Close by.</span><a href="/">Explore the mart</a></footer>
    </main>
  );
}
