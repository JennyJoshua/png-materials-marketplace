"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  price: string;
  stockStatus: string;
  category: Category;
  providerProfile: { displayName: string; province: string };
};
type Filters = {
  q: string;
  cat: string;
  province: string;
  stock: string;
  sort: string;
};

const stockLabels: Record<string, string> = {
  IN_STOCK: "In stock",
  LIMITED_STOCK: "Limited stock",
  OUT_OF_STOCK: "Out of stock",
  CONTACT_SUPPLIER: "Contact supplier",
};

export function ProductBrowser() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [province, setProvince] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/categories")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error("Unable to load product categories.");
        }
        if (!cancelled) setCategories(result.data.categories);
      })
      .catch(() => {
        if (!cancelled) setCategoryError("Product categories could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function load(
    targetPage = 1,
    filters: Filters = {
      q: query,
      cat: categoryId,
      province,
      stock: stockStatus,
      sort,
    },
  ) {
    setBusy(true);
    setError("");

    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "12",
      sort: filters.sort,
    });
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.cat) params.set("categoryId", filters.cat);
    if (filters.province.trim()) params.set("province", filters.province.trim());
    if (filters.stock) params.set("stockStatus", filters.stock);

    try {
      const response = await fetch("/api/products?" + params.toString(), {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Unable to load products.");
      }

      setProducts(result.data.items);
      setPage(result.data.pagination.page);
      setPages(Math.max(1, result.data.pagination.pages));
      setTotal(result.data.pagination.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load products.");
      setProducts([]);
    } finally {
      setBusy(false);
    }
  }

  // Load the initial catalogue once; subsequent loads are user initiated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, []);

  function clearFilters() {
    setQuery("");
    setCategoryId("");
    setProvince("");
    setStockStatus("");
    setSort("newest");
    void load(1, { q: "", cat: "", province: "", stock: "", sort: "newest" });
  }

  return (
    <section aria-busy={busy}>
      <form
        className="filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void load(1);
        }}
      >
        <label>
          Search products
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cement, roofing iron, steel…"
            maxLength={100}
          />
        </label>

        <div className="filter-grid">
          <label>
            Category
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Province
            <input
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              placeholder="Any province"
              maxLength={100}
            />
          </label>

          <label>
            Availability
            <select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>
              <option value="">Any availability</option>
              {Object.entries(stockLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Recently updated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button className="btn" type="submit">
            Search marketplace
          </button>
          <button className="btn secondary" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </form>

      {categoryError ? <p className="alert info" role="status">{categoryError}</p> : null}

      <div className="results-heading">
        <h2>Available products</h2>
        <span className="muted" aria-live="polite">
          {busy ? "Loading…" : total + " listings"}
        </span>
      </div>

      {error ? (
        <p className="alert" role="alert">
          {error}{" "}
          <button className="text-button" type="button" onClick={() => void load(page)}>
            Retry
          </button>
        </p>
      ) : null}

      {busy ? <div className="panel">Loading marketplace…</div> : null}

      {!busy && !products.length && !error ? (
        <div className="panel">
          <h3>No matching products yet</h3>
          <p>Try another search or clear some filters.</p>
        </div>
      ) : null}

      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-placeholder">
              <span>{product.category.name}</span>
            </div>
            <div className="product-card-body">
              <p className="eyebrow">{product.category.name}</p>
              <h3>
                <Link href={"/products/" + product.id}>{product.name}</Link>
              </h3>
              {product.brand ? <p className="muted">{product.brand}</p> : null}
              <p className="product-price">
                {new Intl.NumberFormat("en-PG", {
                  style: "currency",
                  currency: "PGK",
                }).format(Number(product.price))}{" "}
                / {product.unit}
              </p>
              <div className="product-meta">
                <span className="badge">
                  {stockLabels[product.stockStatus] || product.stockStatus}
                </span>
                <span className="muted">{product.providerProfile.province}</span>
              </div>
              <p>{product.providerProfile.displayName}</p>
              <Link href={"/products/" + product.id}>View details →</Link>
            </div>
          </article>
        ))}
      </div>

      {!busy && pages > 1 ? (
        <nav className="pagination" aria-label="Product pages">
          <button
            className="btn secondary"
            type="button"
            disabled={page === 1}
            onClick={() => void load(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="btn secondary"
            type="button"
            disabled={page === pages}
            onClick={() => void load(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
