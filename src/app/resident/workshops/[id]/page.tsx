import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Award,
  Video,
  Building,
  Check,
  AlertCircle,
  Leaf,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkshopType, LocationType } from "@/types/database";

const TYPE_CONFIG: Record<
  WorkshopType,
  { label: string; color: string; icon: string }
> = {
  workshop: { label: "Workshop", color: "bg-blue-500", icon: "🛠️" },
  campaign: { label: "Campaign", color: "bg-purple-500", icon: "📢" },
  training: { label: "Training", color: "bg-green-500", icon: "📚" },
  event: { label: "Event", color: "bg-orange-500", icon: "🎉" },
};

const LOCATION_CONFIG: Record<
  LocationType,
  { label: string; icon: typeof MapPin }
> = {
  "in-person": { label: "In-Person", icon: Building },
  online: { label: "Online", icon: Video },
  hybrid: { label: "Hybrid", icon: Users },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDuration(start: string, end: string | null): string {
  if (!end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return `${diffDays} days`;
  if (diffHours > 1) return `${diffHours} hours`;
  return `${Math.round(diffMs / (1000 * 60))} minutes`;
}

// Server action for registration
async function registerForWorkshop(formData: FormData) {
  "use server";

  const workshopId = formData.get("workshopId") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("workshop_registrations")
    .select("id")
    .eq("workshop_id", workshopId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Already registered, cancel registration
    await supabase
      .from("workshop_registrations")
      .update({ status: "cancelled" })
      .eq("id", existing.id);
  } else {
    // Register
    await supabase.from("workshop_registrations").insert({
      workshop_id: workshopId,
      user_id: user.id,
      status: "registered",
    });
  }

  redirect(`/resident/workshops/${workshopId}`);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch workshop
  const { data: workshop, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !workshop) {
    notFound();
  }

  // Get current user and check registration
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isRegistered = false;

  if (user) {
    const { data: registration } = await supabase
      .from("workshop_registrations")
      .select("status")
      .eq("workshop_id", id)
      .eq("user_id", user.id)
      .eq("status", "registered")
      .single();

    isRegistered = !!registration;
  }

  // Get registration count
  const { count: registrationsCount } = await supabase
    .from("workshop_registrations")
    .select("id", { count: "exact" })
    .eq("workshop_id", id)
    .eq("status", "registered");

  const typeConfig = TYPE_CONFIG[workshop.type as WorkshopType];
  const locationConfig =
    LOCATION_CONFIG[workshop.location_type as LocationType];
  const LocationIcon = locationConfig.icon;

  const isFull = Boolean(
    workshop.max_participants &&
    (registrationsCount || 0) >= workshop.max_participants,
  );
  const isPast = new Date(workshop.ends_at || workshop.starts_at) < new Date();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Back Button */}
      <Link href="/resident/workshops">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workshops
        </Button>
      </Link>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <Badge
              className={`${typeConfig.color} text-white text-sm px-3 py-1`}
            >
              {typeConfig.icon} {typeConfig.label}
            </Badge>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary font-bold">
                <Award className="h-4 w-4 mr-1" />+{workshop.points_reward}{" "}
                points
              </Badge>
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl">
            {workshop.title}
          </CardTitle>
          {workshop.short_description && (
            <CardDescription className="text-base mt-2">
              {workshop.short_description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Details Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(workshop.starts_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(workshop.starts_at)}
                  {workshop.ends_at && ` - ${formatTime(workshop.ends_at)}`}
                </p>
                {workshop.ends_at && (
                  <p className="text-sm text-primary font-medium">
                    Duration:{" "}
                    {getDuration(workshop.starts_at, workshop.ends_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <LocationIcon className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{locationConfig.label}</p>
                {workshop.location && (
                  <p className="text-sm text-muted-foreground">
                    {workshop.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Stats */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {registrationsCount || 0} registered
                {workshop.max_participants &&
                  ` / ${workshop.max_participants} spots`}
              </span>
            </div>

            {isFull && !isRegistered && (
              <Badge variant="destructive">Full</Badge>
            )}
          </div>

          {/* Registration Button */}
          {!isPast && user && (
            <form action={registerForWorkshop}>
              <input type="hidden" name="workshopId" value={workshop.id} />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                variant={isRegistered ? "secondary" : "default"}
                disabled={isFull && !isRegistered}
              >
                {isRegistered ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Registered - Click to Cancel
                  </>
                ) : isFull ? (
                  <>
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Workshop Full
                  </>
                ) : (
                  <>
                    <Leaf className="mr-2 h-5 w-5" />
                    Register Now
                  </>
                )}
              </Button>
            </form>
          )}

          {!user && (
            <Link href="/auth/login">
              <Button size="lg" className="w-full">
                Login to Register
              </Button>
            </Link>
          )}

          {isPast && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground">This workshop has ended.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {workshop.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              About This {typeConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {workshop.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {workshop.requirements && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{workshop.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {workshop.tags && workshop.tags.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {workshop.tags.map((tag: string, i: number) => (
                <Badge key={i} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
