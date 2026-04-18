import { redirect } from "next/navigation";

/**
 * Legacy redirect: Recycler marketplace has been moved to /recycler/marketplace.
 * This page exists for backward compatibility.
 */
export default function CollectorMarketplacePage() {
  redirect("/recycler/marketplace");
}
