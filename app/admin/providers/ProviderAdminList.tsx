"use client";

import { useState } from "react";

type Provider = {
  id: string;
  displayName: string;
  providerKind: string;
  providerType: string;
  province: string;
  district: string | null;
  townOrArea: string | null;
  status: string;
  verificationLevel: string;
  user: { fullName: string; email: string };
};

export function ProviderAdminList({ providers }: { providers: Provider[] }) {
  const [rows, setRows] = useState(providers);
  const [msg, setMsg] = useState("");

  async function change(id: string, data: Record<string, string>) {
    setMsg("");
    const response = await fetch("/api/admin/providers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId: id, ...data }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMsg(result.error?.message ?? "Action failed");
      return;
    }
    setRows((old) =>
      old.map((provider) =>
        provider.id === id ? { ...provider, ...result.data.provider } : provider,
      ),
    );
    setMsg("Provider record updated.");
  }

  return (
    <section className="panel">
      {msg && <p role="status">{msg}</p>}
      {rows.length === 0 ? (
        <p>No provider profiles yet.</p>
      ) : (
        rows.map((provider) => (
          <article className="tile" key={provider.id} style={{ marginBottom: "0.8rem" }}>
            <h2>{provider.displayName}</h2>
            <p>
              {provider.user.fullName} · {provider.user.email}
            </p>
            <p>
              {provider.providerKind} · {provider.providerType} ·{" "}
              {[provider.townOrArea, provider.district, provider.province]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p>
              Status: <b>{provider.status}</b> · Verification:{" "}
              <b>{provider.verificationLevel}</b>
            </p>
            <div className="grid">
              <label>
                Status
                <select
                  value={provider.status}
                  onChange={(event) =>
                    change(provider.id, { status: event.target.value })
                  }
                >
                  <option value="DRAFT">DRAFT (review required)</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </label>
              <label>
                Verification
                <select
                  value={provider.verificationLevel}
                  onChange={(event) =>
                    change(provider.id, { verificationLevel: event.target.value })
                  }
                >
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="CONTACT_CONFIRMED">CONTACT_CONFIRMED</option>
                  <option value="DOCUMENTS_CHECKED">DOCUMENTS_CHECKED</option>
                </select>
              </label>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
