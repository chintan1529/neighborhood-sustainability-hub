import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Store, MapPin, Star } from "lucide-react";

export default async function RecyclerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", user.id)
    .single();

  const { data: recyclerProfile } = await (supabase as any)
    .from("recycler_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <User className="w-8 h-8 text-teal-600" /> Profile
        </h2>
        <p className="text-muted-foreground">
          Manage your personal and business information.
        </p>
      </div>

      {/* User Info Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-semibold text-lg">
                {(profile as any)?.full_name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold text-lg">
                {(profile as any)?.phone || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm text-muted-foreground">
                {user.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Profile */}
      {recyclerProfile ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-teal-600" /> Business Profile
            </CardTitle>
            <CardDescription>Your recycler business details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-semibold text-lg">
                  {recyclerProfile.business_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tax ID / GST</p>
                <p className="font-semibold text-lg font-mono">
                  {recyclerProfile.tax_id || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Radius</p>
                <p className="font-semibold flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-teal-600" />{" "}
                  {recyclerProfile.service_radius_km} km
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />{" "}
                  {recyclerProfile.total_rating?.toFixed(1)} (
                  {recyclerProfile.review_count} reviews)
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Verification Status
                </p>
                <Badge
                  className={`capitalize ${
                    recyclerProfile.verification_status === "approved"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : recyclerProfile.verification_status === "pending"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {recyclerProfile.verification_status}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Accepted Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {recyclerProfile.accepted_categories?.map((cat: string) => (
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
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-dashed">
          <CardContent className="py-10 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">
              No recycler business profile found.
            </p>
            <a
              href="/recycler/marketplace"
              className="text-teal-600 font-semibold hover:underline"
            >
              Complete Onboarding →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
