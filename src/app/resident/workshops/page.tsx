import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Award,
  Video,
  Building,
  Sparkles,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import type { Workshop, WorkshopType, LocationType } from "@/types/database";

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
    weekday: "short",
    day: "numeric",
    month: "short",
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

function getTimeUntil(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Ended";
  if (diffDays === 0) return "Today!";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  return `In ${Math.ceil(diffDays / 7)} weeks`;
}

interface WorkshopCardProps {
  workshop: Workshop & { registrations_count?: number };
  isRegistered?: boolean;
}

function WorkshopCard({ workshop, isRegistered }: WorkshopCardProps) {
  const typeConfig = TYPE_CONFIG[workshop.type];
  const locationConfig = LOCATION_CONFIG[workshop.location_type];
  const LocationIcon = locationConfig.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge className={`${typeConfig.color} text-white`}>
            {typeConfig.icon} {typeConfig.label}
          </Badge>
          <span className="text-sm font-medium text-primary">
            {getTimeUntil(workshop.starts_at)}
          </span>
        </div>
        <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
          {workshop.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {workshop.short_description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(workshop.starts_at)} at {formatTime(workshop.starts_at)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LocationIcon className="h-4 w-4" />
          <span>{locationConfig.label}</span>
          {workshop.location && (
            <span className="text-xs">• {workshop.location}</span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            {workshop.max_participants && (
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {workshop.registrations_count || 0}/
                  {workshop.max_participants}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-primary font-medium">
              <Award className="h-4 w-4" />
              <span>+{workshop.points_reward} pts</span>
            </div>
          </div>

          <Link href={`/resident/workshops/${workshop.id}`}>
            <Button size="sm" variant={isRegistered ? "secondary" : "default"}>
              {isRegistered ? "Registered ✓" : "Learn More"}
            </Button>
          </Link>
        </div>

        {/* Tags */}
        {workshop.tags && workshop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {workshop.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function WorkshopsContent() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all workshops
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("*")
    .in("status", ["upcoming", "ongoing", "completed"])
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Error fetching workshops:", error);
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">
          Unable to load workshops. Please try again later.
        </p>
      </div>
    );
  }

  // Get user's registrations if logged in
  let registeredIds: string[] = [];
  if (user) {
    const { data: registrations } = await supabase
      .from("workshop_registrations")
      .select("workshop_id")
      .eq("user_id", user.id)
      .eq("status", "registered");

    registeredIds = registrations?.map((r) => r.workshop_id) || [];
  }

  // Get registration counts
  const { data: counts } = await supabase
    .from("workshop_registrations")
    .select("workshop_id")
    .eq("status", "registered");

  const countMap: Record<string, number> = {};
  counts?.forEach((c) => {
    countMap[c.workshop_id] = (countMap[c.workshop_id] || 0) + 1;
  });

  // Split by time
  const now = new Date();
  const upcomingWorkshops =
    workshops?.filter((w) => new Date(w.starts_at) > now) || [];
  const ongoingWorkshops =
    workshops?.filter((w) => {
      const start = new Date(w.starts_at);
      const end = w.ends_at
        ? new Date(w.ends_at)
        : new Date(start.getTime() + 2 * 60 * 60 * 1000);
      return start <= now && now <= end;
    }) || [];
  const pastWorkshops =
    workshops?.filter((w) => {
      const end = w.ends_at
        ? new Date(w.ends_at)
        : new Date(new Date(w.starts_at).getTime() + 2 * 60 * 60 * 1000);
      return end < now;
    }) || [];

  const myWorkshops =
    workshops?.filter((w) => registeredIds.includes(w.id)) || [];

  return (
    <Tabs defaultValue="upcoming" className="space-y-6">
      <TabsList>
        <TabsTrigger value="upcoming">
          Upcoming ({upcomingWorkshops.length})
        </TabsTrigger>
        {ongoingWorkshops.length > 0 && (
          <TabsTrigger value="ongoing">
            Happening Now ({ongoingWorkshops.length})
          </TabsTrigger>
        )}
        <TabsTrigger value="my">
          My Registrations ({myWorkshops.length})
        </TabsTrigger>
        <TabsTrigger value="past">Past ({pastWorkshops.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming">
        {upcomingWorkshops.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No upcoming workshops at the moment.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back soon for new events!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={{
                  ...workshop,
                  registrations_count: countMap[workshop.id] || 0,
                }}
                isRegistered={registeredIds.includes(workshop.id)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ongoing">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ongoingWorkshops.map((workshop) => (
            <WorkshopCard
              key={workshop.id}
              workshop={{
                ...workshop,
                registrations_count: countMap[workshop.id] || 0,
              }}
              isRegistered={registeredIds.includes(workshop.id)}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="my">
        {myWorkshops.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                You haven&apos;t registered for any workshops yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Browse upcoming workshops and join one!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={{
                  ...workshop,
                  registrations_count: countMap[workshop.id] || 0,
                }}
                isRegistered={true}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="past">
        {pastWorkshops.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No past workshops to show.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
            {pastWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={{
                  ...workshop,
                  registrations_count: countMap[workshop.id] || 0,
                }}
                isRegistered={registeredIds.includes(workshop.id)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function WorkshopsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workshops & Campaigns</h1>
        <p className="text-muted-foreground">
          Join community events, learn new skills, and earn points while making
          a positive impact!
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-600">🛠️</div>
            <p className="text-sm text-muted-foreground">Workshops</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-purple-600">📢</div>
            <p className="text-sm text-muted-foreground">Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">📚</div>
            <p className="text-sm text-muted-foreground">Trainings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-600">🎉</div>
            <p className="text-sm text-muted-foreground">Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Workshops List */}
      <Suspense
        fallback={
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-20 mb-2" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <WorkshopsContent />
      </Suspense>
    </div>
  );
}
