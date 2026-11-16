"use client";

import { useEffect, useMemo, useState } from "react";

const categories = [
  { name: "All shops", icon: "✳", slug: "all" },
  { name: "Food & drinks", icon: "🥘", slug: "food" },
  { name: "Clothing", icon: "👕", slug: "fashion" },
  { name: "Accessories", icon: "💍", slug: "accessories" },
  { name: "Gadgets", icon: "🎧", slug: "gadgets" },
  { name: "Beauty", icon: "🧴", slug: "beauty" },
  { name: "Other services", icon: "✦", slug: "other-services" },
];

function categorySlug(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const known = categories.find((category) => category.name.toLowerCase() === normalized);
  if (known) return known.slug;
  return normalized.replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "other";
}

const shops = [
  {
    name: "Chop & Chill",
    category: "Food & drinks",
    slug: "food",
    description: "Comfort food, made fresh",
    keywords: "jollof rice meals",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85",
    rating: "4.9",
    orders: 128,
    delivery: "15–25 min",
    badge: "Top seller",
    initials: "C",
    color: "#e9764d",
  },
  {
    name: "The Daily Drip",
    category: "Fashion",
    slug: "fashion",
    description: "Looks that do the talking",
    keywords: "outfits clothes",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
    rating: "4.8",
    orders: 96,
    delivery: "Same day",
    badge: "Trending",
    initials: "D",
    color: "#9b82c4",
  },
  {
    name: "Pocket Friendly",
    category: "Gadgets",
    slug: "gadgets",
    description: "Everyday tech, better prices",
    keywords: "headphones earbuds chargers",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
    rating: "4.7",
    orders: 74,
    delivery: "20–30 min",
    badge: "Fast delivery",
    initials: "P",
    color: "#7f9b87",
  },
  {
    name: "Little Luxuries",
    category: "Accessories",
    slug: "accessories",
    description: "The finishing touches",
    keywords: "jewelry bags accessories",
    image:
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85",
    rating: "4.9",
    orders: 61,
    delivery: "Same day",
    badge: "",
    initials: "L",
    color: "#d5a255",
  },
  {
    name: "Blend & Bloom",
    category: "Food & drinks",
    slug: "food",
    description: "Smoothies and feel-good bowls",
    keywords: "smoothies juice fruit bowls",
    image:
      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=85",
    rating: "4.8",
    orders: 52,
    delivery: "15–25 min",
    badge: "Fresh picks",
    initials: "B",
    color: "#91a866",
  },
  {
    name: "Glow Theory",
    category: "Beauty",
    slug: "beauty",
    description: "Your everyday beauty edit",
    keywords: "skincare makeup beauty",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",
    rating: "4.6",
    orders: 38,
    delivery: "Same day",
    badge: "",
    initials: "G",
    color: "#dc8b9b",
  },
];

const bars = [
  { name: "Chop & Chill", orders: 128, width: 100 },
  { name: "The Daily Drip", orders: 96, width: 75 },
  { name: "Pocket Friendly", orders: 74, width: 58 },
  { name: "Little Luxuries", orders: 61, width: 48 },
];

function ArrowIcon({ diagonal = false }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

function ShopCard({ shop }) {
  const accentColor = /^#[\da-f]{6}$/i.test(shop.theme?.accentColor || "")
    ? shop.theme.accentColor
    : undefined;
  const gradientStart = /^#[\da-f]{6}$/i.test(shop.theme?.gradientStart || "")
    ? shop.theme.gradientStart
    : accentColor;
  const gradientEnd = /^#[\da-f]{6}$/i.test(shop.theme?.gradientEnd || "")
    ? shop.theme.gradientEnd
    : accentColor;
  const brandStrip = shop.theme?.mode === "gradient" && gradientStart && gradientEnd
    ? `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`
    : accentColor;
  const fontFamily = {
    sans: "Arial, sans-serif",
    serif: "Georgia, serif",
    rounded: "Trebuchet MS, sans-serif",
    mono: "Courier New, monospace",
  }[shop.theme?.font];

  return (
    <article className="shop-card">
      <a className="shop-image-link" href={shop.id ? `/shops/${encodeURIComponent(shop.id)}` : "#shops"} aria-label={`View ${shop.name}`}>
        <img className="shop-image" src={shop.image} alt={`${shop.name} shop banner`} />
        {shop.badge && <span className="shop-badge">{shop.badge}</span>}
        <span className="open-indicator"><i /> Open now</span>
        {brandStrip && <span className="shop-theme-accent" style={{ background: brandStrip }} aria-hidden="true" />}
      </a>
      <div className="shop-card-content">
        <div className="shop-title-row">
          <div>
            <p className="shop-category" style={accentColor ? { color: accentColor } : undefined}>{shop.category}</p>
            <h3 style={fontFamily ? { fontFamily } : undefined}>{shop.name}</h3>
          </div>
          <span className="rating"><span aria-hidden="true">★</span> {shop.rating}</span>
        </div>
        <p className="shop-description">{shop.description}</p>
        <div className="shop-meta">
          <span><span aria-hidden="true">◷</span> {shop.delivery}</span>
          <span className="meta-divider" />
          <span><span aria-hidden="true">↗</span> {shop.orders} orders today</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [shopData, setShopData] = useState(shops);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTheme, setActiveTheme] = useState("food");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [hasShop, setHasShop] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/shops", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (active && Array.isArray(result)) {
          const listedShops = result.map((shop) => ({
            ...shop,
            slug: categorySlug(shop.category),
            rating: shop.rating || "New",
            orders: shop.dailyOrders || 0,
            delivery: shop.deliveryEstimate || "Ask the shop",
            badge: "",
            image: shop.image || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85",
            keywords: shop.keywords || "",
          }));
          setShopData(listedShops.length
            ? (process.env.NODE_ENV === "development" ? [...listedShops, ...shops] : listedShops)
            : shops);
        }
      }).catch(() => {}).finally(() => {
        if (active) setShopsLoading(false);
      });
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.user) return;
        setViewer(result.user);
        setPreferredCategories((result.user.preferences?.categories || []).map(categorySlug));
        if (result.user.sellerStatus === "paid") {
          fetch("/api/seller/shop", { cache: "no-store", credentials: "same-origin" })
            .then((response) => response.ok ? response.json() : null)
            .then((shopResult) => {
              if (active && shopResult?.shop) setHasShop(true);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category && (category === "all" || categories.some((item) => item.slug === category))) {
      setActiveCategory(category);
      if (["food", "fashion", "gadgets", "accessories"].includes(category)) setActiveTheme(category);
    }
    return () => { active = false; };
  }, []);

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = shopData.filter((shop) => {
      const matchesCategory =
        activeCategory === "all" || shop.slug === activeCategory;
      const matchesSearch =
        !query ||
        `${shop.name} ${shop.category} ${shop.description} ${shop.keywords}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
    if (activeCategory === "all" && !query && preferredCategories.length) {
      return [...filtered].sort((a, b) => {
        const aRank = preferredCategories.indexOf(a.slug);
        const bRank = preferredCategories.indexOf(b.slug);
        return (aRank < 0 ? Infinity : aRank) - (bRank < 0 ? Infinity : bRank);
      });
    }
    return filtered;
  }, [activeCategory, search, shopData, preferredCategories]);

  function chooseCategory(slug) {
    setActiveCategory(slug);
    if (["food", "fashion", "gadgets", "accessories"].includes(slug)) setActiveTheme(slug);
    setMenuOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (slug === "all") params.delete("category"); else params.set("category", slug);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }

  return (
    <main className={`mart-theme theme-${activeTheme}`}>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="RSU Mart home">
            <span className="brand-mark">r<span>.</span></span>
            <span>rsu<span className="brand-light">mart</span></span>
          </a>
          <div className="location">
            <span className="location-pin" aria-hidden="true">⌖</span>
            <span><small>DELIVERING AROUND</small><strong>{viewer?.preferences?.campusLocation || "RSU campus"}</strong></span>
            <span className="location-chevron" aria-hidden="true">⌄</span>
          </div>
          <div className="header-actions">
            {viewer?.isAdmin && <a className="seller-link" href="/admin/transfers">Admin <ArrowIcon diagonal /></a>}
            <a className="seller-link" href={hasShop ? "/seller/products" : "/seller"}>
              {hasShop ? "My shop" : "Open a shop"} <ArrowIcon diagonal />
            </a>
            <a className="account-link" href={viewer ? "/profile" : "/login"}>{viewer ? viewer.name.split(" ")[0] : "Sign in"}</a>
          </div>
        </div>
      </header>

      <section className="category-experience" aria-label="Choose what to shop">
        <div className="category-experience-heading">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR CAMPUS, ALL IN ONE PLACE</div>
          <h1>What are you <span>shopping for?</span></h1>
          <p>Pick a lane. Find your people. Get the good stuff close by.</p>
        </div>
        <div className="category-doors">
          <button className={`category-door door-food ${activeCategory === "food" ? "active" : ""}`} aria-pressed={activeCategory === "food"} onClick={() => chooseCategory("food")}><span className="door-index">01 / FRESH & LOCAL</span><span className="door-icon">🥘</span><strong>Food & drinks</strong><span className="door-description">Comfort food, cold drinks, little treats.</span><span className="door-link">Explore food <ArrowIcon /></span></button>
          <button className={`category-door door-fashion ${activeCategory === "fashion" ? "active" : ""}`} aria-pressed={activeCategory === "fashion"} onClick={() => chooseCategory("fashion")}><span className="door-index">02 / YOUR NEXT LOOK</span><span className="door-icon">✦</span><strong>Clothing</strong><span className="door-description">Fits with a little more main character.</span><span className="door-link">Find your fit <ArrowIcon /></span></button>
          <button className={`category-door door-gadgets ${activeCategory === "gadgets" ? "active" : ""}`} aria-pressed={activeCategory === "gadgets"} onClick={() => chooseCategory("gadgets")}><span className="door-index">03 / GEAR UP</span><span className="door-icon">⌘</span><strong>Gadgets</strong><span className="door-description">Smart tech for campus and everywhere.</span><span className="door-link">Explore tech <ArrowIcon /></span></button>
          <button className={`category-door door-accessories ${activeCategory === "accessories" ? "active" : ""}`} aria-pressed={activeCategory === "accessories"} onClick={() => chooseCategory("accessories")}><span className="door-index">04 / THE FINAL TOUCH</span><span className="door-icon">✧</span><strong>Accessories</strong><span className="door-description">Small details. Unmistakable energy.</span><span className="door-link">Find your extra <ArrowIcon /></span></button>
        </div>
        <form className="search-bar category-search" onSubmit={(event) => { event.preventDefault(); document.getElementById("shops")?.scrollIntoView({ behavior: "smooth" }); }}>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input aria-label="Search shops, food, fashion and more" placeholder="Search anything around campus…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button className="clear-search" type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          <button className="search-submit" type="submit">Search <ArrowIcon /></button>
        </form>
        <div className="category-experience-footer"><span>Local finds for every side of campus life.</span><a href="#shops">BROWSE ALL SHOPS <ArrowIcon /></a></div>
      </section>

      <section className="category-section legacy-category-section" aria-label="More shop categories">
        <div className="section-heading category-heading"><div><p className="section-kicker">MORE AROUND YOU</p><h2>Explore every corner of the mart</h2></div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><span className="menu-lines"><i /><i /></span>Browse categories</button>
        </div>
        <div className="category-list">
          {categories.filter((category) => !["food", "fashion", "gadgets", "accessories"].includes(category.slug)).map((category) => <button className={`category-chip ${activeCategory === category.slug ? "selected" : ""}`} key={category.slug} onClick={() => chooseCategory(category.slug)} aria-pressed={activeCategory === category.slug}><span className="category-icon">{category.icon}</span><span>{category.name}</span><ArrowIcon /></button>)}
          <button className={`category-chip ${activeCategory === "all" ? "selected" : ""}`} onClick={() => chooseCategory("all")} aria-pressed={activeCategory === "all"}><span className="category-icon">✳</span><span>All shops</span><ArrowIcon /></button>
        </div>
        {menuOpen && <div className="category-menu"><p>SHOP BY CATEGORY</p>{categories.map((category) => <button key={category.slug} onClick={() => chooseCategory(category.slug)} aria-pressed={activeCategory === category.slug}><span>{category.icon}</span>{category.name}<ArrowIcon /></button>)}</div>}
      </section>

      <section className="shops-section" id="shops">
        <div className="section-heading shops-heading">
          <div>
            <p className="section-kicker">THE NEIGHBOURHOOD FAVOURITES</p>
            <h2>{search ? "Here’s what we found." : activeCategory === "all" ? "The spots everyone's talking about." : `${categories.find((item) => item.slug === activeCategory)?.name} around you.`}</h2>
          </div>
          <span className="live-tag"><i /> OPEN RIGHT NOW</span>
        </div>
        {shopsLoading ? (
          <div className="shop-grid shop-grid-loading" aria-label="Loading shops" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => <div className="shop-card shop-skeleton" key={index}><span /><div><i /><i /><i /></div></div>)}
          </div>
        ) : visibleShops.length > 0 ? (
          <div className="shop-grid">
            {visibleShops.map((shop) => <ShopCard key={shop.id || shop.name} shop={shop} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span>⌕</span><h3>No shops found just yet.</h3>
            <p>Try a different search or explore all the shops.</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }}>See all shops <ArrowIcon /></button>
          </div>
        )}
        {visibleShops.length > 0 && (
          <div className="shops-footer">
            <span>Showing {visibleShops.length} neighbourhood {visibleShops.length === 1 ? "favourite" : "favourites"}</span>
            <button onClick={() => { setActiveCategory("all"); setSearch(""); }}>Explore all shops <ArrowIcon /></button>
          </div>
        )}
      </section>

      <section className="community-section" id="community">
        <div className="community-copy">
          <p className="section-kicker">THE CAMPUS PULSE</p>
          <h2>Small businesses.<br /><span>Big main-character energy.</span></h2>
          <p className="community-description">Every order keeps a local dream moving. Here’s who the campus is showing love to today.</p>
          <div className="community-proof"><span className="proof-avatars"><i>C</i><i>D</i><i>P</i></span><span><strong>Your neighbours are here.</strong><small>Shop local. Make someone’s day.</small></span></div>
        </div>
        <div className="chart-card">
          <div className="chart-heading">
            <div><p>TODAY’S MOST LOVED</p><h3>Campus favourites</h3></div>
            <span className="chart-period"><i /> TODAY</span>
          </div>
          <p className="chart-description">Ranked by orders today</p>
          <div className="chart-bars">
            {bars.map((bar, index) => (
              <div className="chart-row" key={bar.name}>
                <span className="chart-rank">0{index + 1}</span>
                <span className="chart-name">{bar.name}</span>
                <div className="chart-track"><span style={{ width: `${bar.width}%` }} /></div>
                <strong className="chart-count">{bar.orders}</strong>
              </div>
            ))}
          </div>
          <div className="chart-footnote"><span>✳</span> Your next favourite is just around the corner.</div>
        </div>
      </section>

      <section className="delivery-section" id="delivery">
        <div className="delivery-art" aria-hidden="true">
          <span className="delivery-circle"><span>↗</span></span>
          <span className="delivery-spark spark-one">✳</span>
          <span className="delivery-spark spark-two">✳</span>
          <span className="delivery-path" />
        </div>
        <div className="delivery-copy">
          <p className="section-kicker">YOUR ORDER, YOUR WAY</p>
          <h2>From their hands<br />to <span>your plans.</span></h2>
          <p>Choose delivery to your door or swing by to pick it up. Your local favourites are closer than you think.</p>
          <div className="delivery-options">
            <span><i>↗</i><strong>Doorstep drop-off</strong><small>Make it a little too easy.</small></span>
            <span><i>⌖</i><strong>Quick pick-up</strong><small>Passing by? Grab and go.</small></span>
          </div>
        </div>
      </section>

      <section className="seller-banner">
        <div className="banner-spark">✳</div>
        <div><p className="section-kicker">GOT SOMETHING GOOD?</p><h2>Your shop deserves<br />a spot on campus.</h2><p>Bring your business to the neighbourhood. We’ll save you a seat.</p></div>
        <a className="seller-banner-link" href="/seller">Become a seller <ArrowIcon diagonal /></a>
        <span className="seller-fee">One-time seller onboarding <strong>₦5,000</strong></span>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark">r<span>.</span></span><span>rsu<span className="brand-light">mart</span></span></a>
        <span>Good finds, close by. Made with <b>♥</b> around RSU.</span>
        <a href="#shops">Back to the good stuff ↑</a>
      </footer>

    </main>
  );
}
