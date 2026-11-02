"use client";

import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string };
type Listing = {
  id: string;
  name: string;
  brand: string | null;
  specification: string | null;
  description: string | null;
  unit: string;
  price: string;
  stockStatus: string;
  listingStatus: string;
  category: { id: string; name: string };
};

const stockOptions = [
  ["IN_STOCK", "In stock"],
  ["LIMITED_STOCK", "Limited stock"],
  ["OUT_OF_STOCK", "Out of stock"],
  ["CONTACT_SUPPLIER", "Contact supplier"],
] as const;

const emptyForm = {
  categoryId: "",
  name: "",
  brand: "",
  specification: "",
  description: "",
  unit: "bag",
  price: "",
  stockStatus: "CONTACT_SUPPLIER",
};

type ListingForm = typeof emptyForm;

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || "Request failed.");
  }
  return result.data;
}

export function ProviderProducts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState<ListingForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [categoryData, listingData] = await Promise.all([
        requestJson("/api/categories"),
        requestJson("/api/providers/products"),
      ]);
      setCategories(categoryData.categories);
      setListings(listingData.listings);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categoryData.categories[0]?.id || "",
      }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load listings.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Load this provider's listings once when the workspace opens.
  useEffect(() => {
    void load();
  }, [load]);

  function updateField(field: keyof ListingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editListing(listing: Listing) {
    setEditingId(listing.id);
    setForm({
      categoryId: listing.category.id,
      name: listing.name,
      brand: listing.brand || "",
      specification: listing.specification || "",
      description: listing.description || "",
      unit: listing.unit,
      price: String(listing.price),
      stockStatus: listing.stockStatus,
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await requestJson(
        editingId ? "/api/providers/products/" + editingId : "/api/providers/products",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(form),
        },
      );
      setMessage(editingId ? "Listing updated." : "Draft created.");
      setEditingId("");
      setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save listing.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(id: string, action: "publish" | "unpublish" | "archive") {
    if (action === "archive" && !window.confirm("Archive this listing?")) return;

    setError("");
    setMessage("");
    try {
      await requestJson("/api/providers/products/" + id + "/" + action, { method: "POST" });
      setMessage(
        action === "unpublish"
          ? "Listing unpublished."
          : action === "archive"
            ? "Listing archived."
            : "Listing published.",
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The listing action failed.");
    }
  }

  return (
    <div>
      {message ? <p className="notice-success" role="status">{message}</p> : null}
      {error ? <p className="alert" role="alert">{error}</p> : null}

      <section className="panel">
        <h2>{editingId ? "Edit listing" : "Add a product listing"}</h2>
        <p className="muted">Prices are entered in PGK. Keep stock information current.</p>

        <form className="listing-form" onSubmit={save}>
          <label>
            Product name
            <input
              required
              maxLength={160}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>

          <label>
            Category
            <select
              required
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Brand
            <input
              maxLength={120}
              value={form.brand}
              onChange={(event) => updateField("brand", event.target.value)}
            />
          </label>

          <label>
            Unit
            <input
              required
              maxLength={40}
              value={form.unit}
              onChange={(event) => updateField("unit", event.target.value)}
            />
          </label>

          <label>
            Price (PGK)
            <input
              required
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,2})?"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
            />
          </label>

          <label>
            Stock status
            <select
              value={form.stockStatus}
              onChange={(event) => updateField("stockStatus", event.target.value)}
            >
              {stockOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="full-field">
            Specifications
            <textarea
              rows={2}
              maxLength={500}
              value={form.specification}
              onChange={(event) => updateField("specification", event.target.value)}
            />
          </label>

          <label className="full-field">
            Description
            <textarea
              rows={3}
              maxLength={4000}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="filter-actions full-field">
            <button className="btn" disabled={!categories.length || saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Save as draft"}
            </button>
            {editingId ? (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <div className="results-heading">
        <h2>Your listings</h2>
        <span className="muted">{listings.length} shown (maximum 100)</span>
      </div>

      {busy ? <div className="panel">Loading…</div> : null}
      {!busy && !listings.length ? (
        <div className="panel">No listings yet. Create your first draft above.</div>
      ) : null}

      <div className="listing-list">
        {listings.map((listing) => (
          <article className="panel listing-row" key={listing.id}>
            <div>
              <p className="eyebrow">{listing.category.name}</p>
              <h3>{listing.name}</h3>
              <p>{listing.price} PGK / {listing.unit}</p>
              <span className={"badge " + (listing.listingStatus === "ACTIVE" ? "gold" : "")}>
                {listing.listingStatus}
              </span>
            </div>

            <div className="listing-actions">
              {["DRAFT", "ACTIVE"].includes(listing.listingStatus) ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => editListing(listing)}
                  aria-label={"Edit " + listing.name}
                >
                  Edit
                </button>
              ) : null}
              {listing.listingStatus === "DRAFT" ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => void runAction(listing.id, "publish")}
                  aria-label={"Publish " + listing.name}
                >
                  Publish
                </button>
              ) : null}
              {listing.listingStatus === "ACTIVE" ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => void runAction(listing.id, "unpublish")}
                  aria-label={"Unpublish " + listing.name}
                >
                  Unpublish
                </button>
              ) : null}
              {["DRAFT", "ACTIVE"].includes(listing.listingStatus) ? (
                <button
                  className="text-button danger-text"
                  type="button"
                  onClick={() => void runAction(listing.id, "archive")}
                  aria-label={"Archive " + listing.name}
                >
                  Archive
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
