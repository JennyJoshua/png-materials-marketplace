import { redirect } from "next/navigation";

/** Retired buyer dashboard. Legacy customer records remain in the database; browsing is public. */
export default function LegacyCustomerDashboard() {
  redirect("/products");
}
