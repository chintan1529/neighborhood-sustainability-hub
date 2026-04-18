import { redirect } from "next/navigation";

/**
 * Legacy redirect: Recycler offers have been moved to /recycler/offers.
 * This page exists for backward compatibility.
 */
export default function CollectorOffersPage() {
  redirect("/recycler/offers");
}
