import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Mail,
  Smartphone,
  BellRing,
  FileText,
  MessageSquare,
  Calendar,
  Trophy,
  Award,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { NotificationPreferences } from "@/types/database";

// Server action to update preferences
async function updatePreferences(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const preferences = {
    in_app_enabled: formData.get("in_app_enabled") === "on",
    email_enabled: formData.get("email_enabled") === "on",
    push_enabled: formData.get("push_enabled") === "on",
    report_updates: formData.get("report_updates") === "on",
    messages: formData.get("messages") === "on",
    workshops: formData.get("workshops") === "on",
    challenges: formData.get("challenges") === "on",
    points_updates: formData.get("points_updates") === "on",
    badge_earned: formData.get("badge_earned") === "on",
    system_updates: formData.get("system_updates") === "on",
    updated_at: new Date().toISOString(),
  };

  // Upsert preferences
  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...preferences,
  });

  revalidatePath("/resident/settings/notifications");
}

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let preferences: Partial<NotificationPreferences> = {
    in_app_enabled: true,
    email_enabled: false,
    push_enabled: false,
    report_updates: true,
    messages: true,
    workshops: true,
    challenges: true,
    points_updates: true,
    badge_earned: true,
    system_updates: true,
  };

  if (user) {
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      preferences = data as NotificationPreferences;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Back Button */}
      <Link href="/resident/notifications">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notifications
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Control how and when you receive notifications.
        </p>
      </div>

      <form action={updatePreferences} className="space-y-6">
        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Channels</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="in_app_enabled" className="font-medium">
                    In-App Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications in the app
                  </p>
                </div>
              </div>
              <Switch
                id="in_app_enabled"
                name="in_app_enabled"
                defaultChecked={preferences.in_app_enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email_enabled" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                id="email_enabled"
                name="email_enabled"
                defaultChecked={preferences.email_enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="push_enabled" className="font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">Coming soon!</p>
                </div>
              </div>
              <Switch
                id="push_enabled"
                name="push_enabled"
                defaultChecked={preferences.push_enabled}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Types</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <Label htmlFor="report_updates" className="font-medium">
                    Report Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Status changes on your reports
                  </p>
                </div>
              </div>
              <Switch
                id="report_updates"
                name="report_updates"
                defaultChecked={preferences.report_updates}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <Label htmlFor="messages" className="font-medium">
                    Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New messages and replies
                  </p>
                </div>
              </div>
              <Switch
                id="messages"
                name="messages"
                defaultChecked={preferences.messages}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <Label htmlFor="workshops" className="font-medium">
                    Workshops & Events
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upcoming workshops and reminders
                  </p>
                </div>
              </div>
              <Switch
                id="workshops"
                name="workshops"
                defaultChecked={preferences.workshops}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-orange-500" />
                <div>
                  <Label htmlFor="challenges" className="font-medium">
                    Challenges
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New challenges and progress updates
                  </p>
                </div>
              </div>
              <Switch
                id="challenges"
                name="challenges"
                defaultChecked={preferences.challenges}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-yellow-500" />
                <div>
                  <Label htmlFor="points_updates" className="font-medium">
                    Points & Rewards
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Points earned and rewards
                  </p>
                </div>
              </div>
              <Switch
                id="points_updates"
                name="points_updates"
                defaultChecked={preferences.points_updates}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-amber-500" />
                <div>
                  <Label htmlFor="badge_earned" className="font-medium">
                    Badges
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New badges earned
                  </p>
                </div>
              </div>
              <Switch
                id="badge_earned"
                name="badge_earned"
                defaultChecked={preferences.badge_earned}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="system_updates" className="font-medium">
                    System Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Important announcements
                  </p>
                </div>
              </div>
              <Switch
                id="system_updates"
                name="system_updates"
                defaultChecked={preferences.system_updates}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button type="submit" size="lg" className="w-full">
          Save Preferences
        </Button>
      </form>
    </div>
  );
}
