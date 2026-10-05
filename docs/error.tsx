"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The error message is intentionally not shown: it can contain internal details.
  return (
    <main style={{ padding: "2rem 1rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Something went wrong</h1>
      <p>We could not load this page. Try again, or come back in a few minutes.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
