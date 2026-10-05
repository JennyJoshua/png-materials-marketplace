"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ApiError = { error?: { code?: string; message?: string; fields?: Record<string, string> } };

async function postJson(url: string, payload: unknown): Promise<{ ok: boolean; status: number; body: Record<string, unknown> & ApiError }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & ApiError;
  return { ok: res.ok, status: res.status, body };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} className="field-error">
      {message}
    </span>
  ) : null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const result = await postJson("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
      ...(next ? { next } : {}),
    }).catch(() => null);
    setBusy(false);
    if (!result) return setError("Could not reach the server. Check your connection and try again.");
    if (!result.ok) return setError(result.body.error?.message ?? "Could not sign in.");
    const data = result.body.data as { redirectTo: string };
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <>
      {notice ? <p className="alert" role="alert">{notice}</p> : null}
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const base = {
      accountType,
      fullName: text("fullName"),
      email: text("email"),
      phone: text("phone"),
      password: text("password"),
      confirmPassword: text("confirmPassword"),
    };
    const payload =
      accountType === "SUPPLIER"
        ? { ...base, businessName: text("businessName"), businessAddress: text("businessAddress"), location: text("location") }
        : base;

    const result = await postJson("/api/auth/register", payload).catch(() => null);
    setBusy(false);
    if (!result) return setFormError("Could not reach the server. Check your connection and try again.");
    if (!result.ok) {
      if (result.body.error?.fields) setErrors(result.body.error.fields);
      return setFormError(result.body.error?.message ?? "Could not create the account.");
    }
    const data = result.body.data as { needsEmailConfirmation: boolean; redirectTo?: string };
    if (data.needsEmailConfirmation || !data.redirectTo) return setConfirmEmail(true);
    router.replace(data.redirectTo);
    router.refresh();
  }

  if (confirmEmail) {
    return (
      <p className="alert info" role="status">
        Check your email. We sent a confirmation link. Open it to finish creating your account, then sign in.
      </p>
    );
  }

  const field = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <>
      {formError ? <p className="alert" role="alert">{formError}</p> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <fieldset>
          <legend>I am registering as</legend>
          <label className="choice">
            <input type="radio" name="accountType" checked={accountType === "CUSTOMER"} onChange={() => setAccountType("CUSTOMER")} />
            A customer buying materials
          </label>
          <label className="choice">
            <input type="radio" name="accountType" checked={accountType === "SUPPLIER"} onChange={() => setAccountType("SUPPLIER")} />
            A supplier selling materials
          </label>
        </fieldset>

        <label>
          {accountType === "SUPPLIER" ? "Contact name" : "Full name"}
          <input name="fullName" autoComplete="name" required {...field("fullName")} />
          <FieldError id="fullName-error" message={errors.fullName} />
        </label>

        {accountType === "SUPPLIER" ? (
          <>
            <label>
              Business name
              <input name="businessName" autoComplete="organization" required {...field("businessName")} />
              <FieldError id="businessName-error" message={errors.businessName} />
            </label>
            <label>
              Business address
              <input name="businessAddress" autoComplete="street-address" required {...field("businessAddress")} />
              <FieldError id="businessAddress-error" message={errors.businessAddress} />
            </label>
            <label>
              Town or province
              <input name="location" required {...field("location")} />
              <FieldError id="location-error" message={errors.location} />
            </label>
          </>
        ) : null}

        <label>
          Email
          <input name="email" type="email" autoComplete="email" required {...field("email")} />
          <FieldError id="email-error" message={errors.email} />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" autoComplete="tel" required {...field("phone")} />
          <FieldError id="phone-error" message={errors.phone} />
        </label>
        <label>
          Password
          <span className="hint">At least 10 characters, with a letter and a number.</span>
          <input name="password" type="password" autoComplete="new-password" required {...field("password")} />
          <FieldError id="password-error" message={errors.password} />
        </label>
        <label>
          Confirm password
          <input name="confirmPassword" type="password" autoComplete="new-password" required {...field("confirmPassword")} />
          <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
        </label>

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
  );
}
