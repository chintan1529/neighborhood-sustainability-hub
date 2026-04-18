import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Store,
  MapPin,
  Recycle,
} from "lucide-react";
import Link from "next/link";

export default async function RecyclerVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: profile } = await (supabase as any)
    .from("recycler_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // No profile yet — redirect to marketplace which shows onboarding
  if (!profile) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-teal-600" /> Verification
          </h2>
          <p className="text-muted-foreground">
            Set up your recycler business profile to get started.
          </p>
        </div>
        <Card className="shadow-xl">
          <CardContent className="py-16 text-center">
            <Recycle className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Profile Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven&apos;t set up your recycler business profile yet.
              Complete the onboarding to start accepting marketplace listings.
            </p>
            <Link href="/recycler/marketplace">
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg shadow-teal-500/20 transition-colors">
                Start Onboarding →
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    {
      icon: any;
      color: string;
      bgColor: string;
      title: string;
      description: string;
    }
  > = {
    pending: {
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      title: "Application Under Review",
      description:
        "Your recycler profile has been submitted and is pending review by an administrator. This usually takes 1-2 business days.",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      title: "Verified Recycler ✓",
      description:
        "Your profile has been approved. You have full access to the marketplace and can start bidding on listings.",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      title: "Application Rejected",
      description:
        "Your profile was not approved. Please review your details and re-submit through the marketplace onboarding.",
    },
    suspended: {
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      title: "Account Suspended",
      description:
        "Your recycler account has been suspended. Please contact support for more information.",
    },
  };

  const config =
    statusConfig[profile.verification_status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-teal-600" /> Verification Status
        </h2>
        <p className="text-muted-foreground">
          Your recycler business verification details.
        </p>
      </div>

      {/* Status Banner */}
      <Card className="shadow-xl">
        <CardContent className="py-8">
          <div className="text-center">
            <div
              className={`mx-auto w-20 h-20 rounded-2xl ${config.bgColor} flex items-center justify-center mb-4`}
            >
              <StatusIcon className={`w-10 h-10 ${config.color}`} />
            </div>
            <h3 className="text-2xl font-bold mb-2">{config.title}</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {config.description}
            </p>

            {profile.verification_status === "rejected" && (
              <Link href="/recycler/marketplace" className="inline-block mt-4">
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg shadow-teal-500/20 transition-colors">
                  Re-submit Application
                </button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-teal-600" /> Business Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-semibold text-lg">{profile.business_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax ID / GST</p>
              <p className="font-semibold text-lg font-mono">
                {profile.tax_id || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Radius</p>
              <p className="font-semibold text-lg flex items-center gap-1">
                <MapPin className="w-4 h-4 text-teal-600" />{" "}
                {profile.service_radius_km} km
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="font-semibold text-lg">
                ★ {profile.total_rating?.toFixed(1) || "0.0"} (
                {profile.review_count || 0} reviews)
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">
                Accepted Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.accepted_categories?.map((cat: string) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="capitalize px-3 py-1"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            {profile.verified_at && (
              <div>
                <p className="text-sm text-muted-foreground">Verified On</p>
                <p className="font-semibold">
                  {new Date(profile.verified_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
