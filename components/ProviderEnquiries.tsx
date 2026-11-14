"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

type Status = "SUBMITTED" | "VIEWED" | "IN_DISCUSSION" | "QUOTATION_SENT" | "CLOSED" | "DECLINED" | "CANCELLED";
type Listing = { id: string; name: string; brand: string | null; unit: string; stockStatus: string } | null;
type EnquiryRow = {
  id: string; publicReference: string; subject: string; status: Status;
  createdAt: string; lastActivityAt: string; updatedAt: string; productListing: Listing;
};
type Message = { id: string; senderType: "VISITOR" | "PROVIDER" | "SYSTEM"; body: string; createdAt: string };
type Detail = EnquiryRow & {
  type: string; summary: string; visitorName: string; visitorEmail: string; visitorPhone: string;
  closedAt: string | null; messages: Message[];
  productListing: (NonNullable<Listing> & { specification: string | null; listingStatus: string }) | null;
};
type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

const statusLabels: Record<Status, string> = {
  SUBMITTED: "New", VIEWED: "Viewed", IN_DISCUSSION: "In discussion",
  QUOTATION_SENT: "Quotation sent", CLOSED: "Closed", DECLINED: "Declined", CANCELLED: "Cancelled",
};
const actions: Partial<Record<Status, { status: Status; label: string }[]>> = {
  SUBMITTED: [{ status: "VIEWED", label: "Mark as viewed" }, { status: "CLOSED", label: "Close enquiry" }, { status: "DECLINED", label: "Decline" }],
  VIEWED: [{ status: "IN_DISCUSSION", label: "Start discussion" }, { status: "CLOSED", label: "Close enquiry" }, { status: "DECLINED", label: "Decline" }],
  IN_DISCUSSION: [{ status: "CLOSED", label: "Close enquiry" }, { status: "DECLINED", label: "Decline" }],
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ProviderEnquiries() {
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [status, setStatus] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    try {
      const response = await fetch(`/api/providers/enquiries?${params.toString()}`, { cache: "no-store" });
      const json = await response.json() as ApiEnvelope<{ enquiries: EnquiryRow[]; pagination: { totalPages: number } }>;
      if (!response.ok || !json.success || !json.data) throw new Error(json.error?.message || "Could not load enquiries.");
      setRows(json.data.enquiries);
      setTotalPages(json.data.pagination.totalPages);
      setDetail((current) => current && !json.data!.enquiries.some((item) => item.id === current.id) ? null : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => { void loadList(); }, [loadList]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/providers/enquiries/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = await response.json() as ApiEnvelope<{ enquiry: Detail }>;
      if (!response.ok || !json.success || !json.data) throw new Error(json.error?.message || "Could not open this enquiry.");
      setDetail(json.data.enquiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this enquiry.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(nextStatus: Status) {
    if (!detail) return;
    const enquiryId = detail.id;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/providers/enquiries/${encodeURIComponent(enquiryId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await response.json() as ApiEnvelope<{ status: Status }>;
      if (!response.ok || !json.success) throw new Error(json.error?.message || "Could not update this enquiry.");
      await openDetail(enquiryId);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this enquiry.");
    } finally {
      setSaving(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(draftQuery.trim());
  }

  return (
    <section className="enquiry-workspace" aria-label="Provider enquiry inbox">
      <div className="panel">
        <form className="enquiry-filters" onSubmit={submitSearch}>
          <label>
            Search enquiries
            <input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} maxLength={100} placeholder="Reference or subject" />
          </label>
          <button className="btn secondary" type="submit">Search</button>
          <label>
            Filter by status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </form>
      </div>

      {error ? <p className="alert" role="alert">{error}</p> : null}
      <div className="enquiry-columns">
        <section className="panel" aria-labelledby="enquiry-list-heading">
          <div className="results-heading">
            <h2 id="enquiry-list-heading">Your enquiries</h2>
            <span className="muted">{rows.length} shown</span>
          </div>
          {loading ? <p role="status">Loading enquiries…</p> : rows.length === 0 ? (
            <p className="muted">No enquiries match these filters yet.</p>
          ) : (
            <ul className="enquiry-list">
              {rows.map((item) => (
                <li key={item.id}>
                  <button type="button" className={detail?.id === item.id ? "enquiry-row selected" : "enquiry-row"} onClick={() => void openDetail(item.id)}>
                    <span className="enquiry-row-top"><strong>{item.subject}</strong><span className="badge">{statusLabels[item.status]}</span></span>
                    <span className="muted">{item.publicReference}</span>
                    {item.productListing ? <span>{item.productListing.name}</span> : null}
                    <span className="muted">Last activity: {dateLabel(item.lastActivityAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="pagination">
            <button className="btn secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span className="muted">Page {page}{totalPages ? ` of ${totalPages}` : ""}</span>
            <button className="btn secondary" type="button" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </section>

        <section className="panel enquiry-detail" aria-labelledby="enquiry-detail-heading">
          <h2 id="enquiry-detail-heading">Enquiry details</h2>
          {detailLoading ? <p role="status">Opening enquiry…</p> : !detail ? (
            <p className="muted">Select an enquiry to view its details and visitor contact information.</p>
          ) : (
            <>
              <p><strong>{detail.publicReference}</strong> <span className="badge">{statusLabels[detail.status]}</span></p>
              <h3>{detail.subject}</h3>
              <p className="muted">Submitted {dateLabel(detail.createdAt)} · Last activity {dateLabel(detail.lastActivityAt)}</p>
              {detail.productListing ? (
                <div className="enquiry-subsection">
                  <h3>Product listing</h3>
                  <p>{detail.productListing.name}{detail.productListing.brand ? ` · ${detail.productListing.brand}` : ""}</p>
                  {detail.productListing.specification ? <p className="muted">{detail.productListing.specification}</p> : null}
                  <p className="muted">Unit: {detail.productListing.unit} · Stock: {detail.productListing.stockStatus}</p>
                </div>
              ) : null}
              <div className="enquiry-subsection">
                <h3>Visitor contact</h3>
                <p>{detail.visitorName}</p>
                <p><a href={`mailto:${detail.visitorEmail}`}>{detail.visitorEmail}</a></p>
                <p><a href={`tel:${detail.visitorPhone.replace(/[^+\d]/g, "")}`}>{detail.visitorPhone}</a></p>
              </div>
              <div className="enquiry-subsection">
                <h3>Message history</h3>
                {detail.messages.map((message) => (
                  <article className="enquiry-message" key={message.id}>
                    <p><strong>{message.senderType === "VISITOR" ? "Visitor" : message.senderType === "PROVIDER" ? "Provider" : "System"}</strong> <span className="muted">· {dateLabel(message.createdAt)}</span></p>
                    <p className="message-body">{message.body}</p>
                  </article>
                ))}
              </div>
              <div className="enquiry-actions">
                {(actions[detail.status] ?? []).map((action) => (
                  <button key={action.status} className="btn secondary" type="button" disabled={saving} onClick={() => void changeStatus(action.status)}>{saving ? "Saving…" : action.label}</button>
                ))}
              </div>
              <p className="hint">This inbox is for internal enquiry management. Replies and visitor notifications are not available in this phase.</p>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
