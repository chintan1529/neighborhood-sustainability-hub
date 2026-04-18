import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Bell, Check, Trash2, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import type { Notification, NotificationType } from "@/types/database";
import { revalidatePath } from "next/cache";

const TYPE_LABELS: Record<
  NotificationType,
  { label: string; icon: string; color: string }
> = {
  report_status: {
    label: "Report Updates",
    icon: "📋",
    color: "bg-blue-100 text-blue-700",
  },
  message: {
    label: "Messages",
    icon: "💬",
    color: "bg-green-100 text-green-700",
  },
  workshop: {
    label: "Workshops",
    icon: "📅",
    color: "bg-purple-100 text-purple-700",
  },
  challenge: {
    label: "Challenges",
    icon: "🏆",
    color: "bg-orange-100 text-orange-700",
  },
  points: {
    label: "Points",
    icon: "⭐",
    color: "bg-yellow-100 text-yellow-700",
  },
  badge: { label: "Badges", icon: "🏅", color: "bg-amber-100 text-amber-700" },
  system: { label: "System", icon: "⚙️", color: "bg-gray-100 text-gray-700" },
  new_offer: {
    label: "New Offer",
    icon: "🔔",
    color: "bg-blue-100 text-blue-700",
  },
  offer_accepted: {
    label: "Offer Accepted",
    icon: "✅",
    color: "bg-green-100 text-green-700",
  },
  pickup_scheduled: {
    label: "Pickup Scheduled",
    icon: "📅",
    color: "bg-purple-100 text-purple-700",
  },
  transaction_completed: {
    label: "Transaction Completed",
    icon: "✅",
    color: "bg-green-100 text-green-700",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Server actions
async function markAsRead(formData: FormData) {
  "use server";
  const notificationId = formData.get("notificationId") as string;
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  revalidatePath("/resident/notifications");
}

async function markAllAsRead() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }

  revalidatePath("/resident/notifications");
}

async function deleteNotification(formData: FormData) {
  "use server";
  const notificationId = formData.get("notificationId") as string;
  const supabase = await createClient();

  await supabase.from("notifications").delete().eq("id", notificationId);

  revalidatePath("/resident/notifications");
}

async function clearAllRead() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);
  }

  revalidatePath("/resident/notifications");
}

async function NotificationsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card className="text-center py-10">
        <CardContent>
          <p className="text-muted-foreground">
            Please log in to view notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return (
      <Card className="text-center py-10">
        <CardContent>
          <p className="text-muted-foreground">Unable to load notifications.</p>
        </CardContent>
      </Card>
    );
  }

  const allNotifications = (notifications as Notification[]) || [];
  const unreadNotifications = allNotifications.filter((n) => !n.is_read);
  const readNotifications = allNotifications.filter((n) => n.is_read);

  if (allNotifications.length === 0) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No notifications</h3>
          <p className="text-muted-foreground">
            You're all caught up! Check back later for updates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{unreadNotifications.length} unread</Badge>
          <Badge variant="secondary">{allNotifications.length} total</Badge>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifications.length > 0 && (
            <form action={markAllAsRead}>
              <Button type="submit" variant="outline" size="sm">
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            </form>
          )}
          {readNotifications.length > 0 && (
            <form action={clearAllRead}>
              <Button type="submit" variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear read
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Notifications Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({allNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
        </TabsContent>

        <TabsContent value="unread" className="space-y-3 mt-4">
          {unreadNotifications.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">All caught up!</p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const typeInfo = TYPE_LABELS[notification.type] || TYPE_LABELS.system;

  return (
    <Card
      className={`transition-colors ${!notification.is_read ? "border-primary/50 bg-primary/5" : ""}`}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-2xl">{typeInfo.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant="secondary"
                  className={`text-xs mb-2 ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </Badge>
                <h4
                  className={`font-medium ${!notification.is_read ? "" : "text-muted-foreground"}`}
                >
                  {notification.title}
                </h4>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(notification.created_at)}
              </span>
            </div>
            {notification.body && (
              <p className="text-sm text-muted-foreground mt-1">
                {notification.body}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {notification.action_url && (
                <Link href={notification.action_url}>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </Link>
              )}
              {!notification.is_read && (
                <form action={markAsRead}>
                  <input
                    type="hidden"
                    name="notificationId"
                    value={notification.id}
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    <Check className="h-4 w-4 mr-1" />
                    Mark read
                  </Button>
                </form>
              )}
              <form action={deleteNotification}>
                <input
                  type="hidden"
                  name="notificationId"
                  value={notification.id}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on your reports, points, and community events.
          </p>
        </div>
        <Link href="/resident/settings/notifications">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <NotificationsContent />
      </Suspense>
    </div>
  );
}
