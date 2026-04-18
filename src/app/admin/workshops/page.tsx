import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Trash2, Users, Award } from "lucide-react";
import { updateWorkshopStatus, deleteWorkshop } from "@/app/actions/admin";
import { WorkshopFormDialog } from "@/components/admin/workshop-form-dialog";

export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();

  // Fetch all workshops
  const { data: workshops, error } = await adminClient
    .from("workshops")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch workshops error:", error);
  }

  // Fetch registration counts per workshop
  const { data: registrations } = await adminClient
    .from("workshop_registrations")
    .select("workshop_id, status")
    .eq("status", "registered");

  const regCountMap: Record<string, number> = {};
  registrations?.forEach((r: any) => {
    regCountMap[r.workshop_id] = (regCountMap[r.workshop_id] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    upcoming: "bg-blue-100 text-blue-800",
    ongoing: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const typeEmojis: Record<string, string> = {
    workshop: "🛠️",
    campaign: "📢",
    training: "📚",
    event: "🎉",
  };

  const locationIcons: Record<string, string> = {
    "in-person": "🏢",
    online: "💻",
    hybrid: "🔗",
  };

  const workshopList = (workshops as any[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Workshops Management
          </h2>
          <p className="text-muted-foreground">
            Create and manage community workshops, campaigns, and events
          </p>
        </div>
        <WorkshopFormDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{workshopList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {workshopList.filter((w: any) => w.status === "upcoming").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ongoing</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {workshopList.filter((w: any) => w.status === "ongoing").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {workshopList.filter((w: any) => w.status === "completed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cancelled</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {workshopList.filter((w: any) => w.status === "cancelled").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Workshops Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Workshops</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workshop</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workshopList.map((workshop: any) => (
                <TableRow key={workshop.id}>
                  <TableCell>
                    <div className="font-medium max-w-[250px]">
                      {workshop.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {workshop.short_description || workshop.description}
                    </div>
                    {workshop.tags && workshop.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {workshop.tags
                          .slice(0, 3)
                          .map((tag: string, i: number) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              #{tag}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {typeEmojis[workshop.type] || ""} {workshop.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[workshop.status] || "bg-gray-100"}
                    >
                      {workshop.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span>
                        {locationIcons[workshop.location_type] || ""}{" "}
                        {workshop.location_type}
                      </span>
                    </div>
                    {workshop.location && (
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {workshop.location}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{formatDate(workshop.starts_at)}</div>
                    {workshop.ends_at && (
                      <div className="text-muted-foreground">
                        to {formatDate(workshop.ends_at)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{regCountMap[workshop.id] || 0}</span>
                      {workshop.max_participants && (
                        <span className="text-muted-foreground">
                          /{workshop.max_participants}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-600"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {workshop.points_reward} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {workshop.status === "draft" && (
                        <form action={(fd) => void updateWorkshopStatus(fd)}>
                          <input
                            type="hidden"
                            name="workshopId"
                            value={workshop.id}
                          />
                          <input type="hidden" name="status" value="upcoming" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600"
                          >
                            Publish
                          </Button>
                        </form>
                      )}
                      {workshop.status === "upcoming" && (
                        <form action={(fd) => void updateWorkshopStatus(fd)}>
                          <input
                            type="hidden"
                            name="workshopId"
                            value={workshop.id}
                          />
                          <input type="hidden" name="status" value="ongoing" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                          >
                            Start
                          </Button>
                        </form>
                      )}
                      {workshop.status === "ongoing" && (
                        <form action={(fd) => void updateWorkshopStatus(fd)}>
                          <input
                            type="hidden"
                            name="workshopId"
                            value={workshop.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="completed"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600"
                          >
                            Complete
                          </Button>
                        </form>
                      )}
                      {(workshop.status === "upcoming" ||
                        workshop.status === "draft") && (
                        <form action={(fd) => void updateWorkshopStatus(fd)}>
                          <input
                            type="hidden"
                            name="workshopId"
                            value={workshop.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="cancelled"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600"
                          >
                            Cancel
                          </Button>
                        </form>
                      )}
                      <form action={(fd) => void deleteWorkshop(fd)}>
                        <input
                          type="hidden"
                          name="workshopId"
                          value={workshop.id}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workshopList.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No workshops yet. Click &quot;New Workshop&quot; to create
                    one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
