import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="btn">
        Go to the home page
      </Link>
    </AppShell>
  );
}
