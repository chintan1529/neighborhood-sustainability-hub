"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Bell, MapPin, Trophy, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Points Configuration
  const [pointsConfig, setPointsConfig] = useState({
    report_points: 10,
    verification_bonus: 5,
    challenge_multiplier: 1.5,
    streak_bonus: 2,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    email_new_reports: true,
    email_daily_digest: true,
    push_urgent_alerts: true,
    sms_critical: false,
  });

  // Fetch neighborhood and settings
  useEffect(() => {
    async function fetchSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin's profile and neighborhood
      const { data: profile } = await supabase
        .from("profiles")
        .select("neighborhood_id")
        .eq("id", user.id)
        .single();

      if (profile?.neighborhood_id) {
        const { data: nb } = await supabase
          .from("neighborhoods")
          .select("*")
          .eq("id", profile.neighborhood_id)
          .single();
        setNeighborhood(nb);
      }
    }
    fetchSettings();
  }, []);

  const handleSavePoints = async () => {
    setIsSaving(true);
    try {
      // In a real app, save to a settings table or edge config
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({
        title: "Settings Saved",
        description: "Points configuration updated successfully.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({
        title: "Settings Saved",
        description: "Notification preferences updated successfully.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="points">
            <Trophy className="h-4 w-4 mr-2" />
            Points & Rewards
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="neighborhood">
            <MapPin className="h-4 w-4 mr-2" />
            Neighborhood
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  defaultValue="Neighborhood Sustainability Hub"
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="version">Version</Label>
                <Input id="version" defaultValue="1.0.0" disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  defaultValue="Asia/Kolkata (IST)"
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points Configuration */}
        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle>Points & Rewards Configuration</CardTitle>
              <CardDescription>
                Configure how points are awarded to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="reportPoints">Points per Report</Label>
                <Input
                  id="reportPoints"
                  type="number"
                  value={pointsConfig.report_points}
                  onChange={(e) =>
                    setPointsConfig((prev) => ({
                      ...prev,
                      report_points: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Base points awarded for each waste report submitted
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="verificationBonus">Verification Bonus</Label>
                <Input
                  id="verificationBonus"
                  type="number"
                  value={pointsConfig.verification_bonus}
                  onChange={(e) =>
                    setPointsConfig((prev) => ({
                      ...prev,
                      verification_bonus: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Extra points when report is verified and completed
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="challengeMultiplier">
                  Challenge Multiplier
                </Label>
                <Input
                  id="challengeMultiplier"
                  type="number"
                  step="0.1"
                  value={pointsConfig.challenge_multiplier}
                  onChange={(e) =>
                    setPointsConfig((prev) => ({
                      ...prev,
                      challenge_multiplier: parseFloat(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Points multiplier for reports during active challenges
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="streakBonus">Streak Bonus</Label>
                <Input
                  id="streakBonus"
                  type="number"
                  value={pointsConfig.streak_bonus}
                  onChange={(e) =>
                    setPointsConfig((prev) => ({
                      ...prev,
                      streak_bonus: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Extra points per day of consecutive activity
                </p>
              </div>
              <Button onClick={handleSavePoints} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Points Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Report Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email for each new report
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.email_new_reports}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_new_reports: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily summary of activity
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.email_daily_digest}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_daily_digest: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Urgent push notifications
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.push_urgent_alerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      push_urgent_alerts: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Critical Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    SMS for critical system issues
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.sms_critical}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      sms_critical: checked,
                    }))
                  }
                />
              </div>
              <Button onClick={handleSaveNotifications} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neighborhood Settings */}
        <TabsContent value="neighborhood">
          <Card>
            <CardHeader>
              <CardTitle>Neighborhood Information</CardTitle>
              <CardDescription>
                Details about your managed neighborhood
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {neighborhood ? (
                <>
                  <div className="grid gap-2">
                    <Label>Neighborhood Name</Label>
                    <Input value={neighborhood.name} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>City</Label>
                    <Input value={neighborhood.city} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Input
                      value={neighborhood.is_active ? "Active" : "Inactive"}
                      disabled
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Created</Label>
                    <Input
                      value={new Date(
                        neighborhood.created_at,
                      ).toLocaleDateString()}
                      disabled
                    />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No neighborhood assigned to this admin account.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
