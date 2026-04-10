'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface SettingsPageClientProps {
    profile: {
        is_available: boolean;
        notification_preferences: {
            email: boolean;
            push: boolean;
            sms: boolean;
        };
    };
    userId: string;
}

export function SettingsPageClient({ profile, userId }: SettingsPageClientProps) {
    const [isAvailable, setIsAvailable] = useState(profile.is_available);
    const [emailNotifs, setEmailNotifs] = useState(profile.notification_preferences?.email ?? true);
    const [pushNotifs, setPushNotifs] = useState(profile.notification_preferences?.push ?? true);
    const [smsNotifs, setSmsNotifs] = useState(profile.notification_preferences?.sms ?? false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_available: isAvailable,
                    notification_preferences: {
                        email: emailNotifs,
                        push: pushNotifs,
                        sms: smsNotifs,
                    },
                })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: 'Settings Saved',
                description: 'Your preferences have been updated successfully.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message,
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
                    Manage your collector preferences
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Availability</CardTitle>
                        <CardDescription>
                            Control whether you appear as available for new pickup assignments
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="available">Available for Pickups</Label>
                                <p className="text-sm text-muted-foreground">
                                    When enabled, you can receive and claim new pickup requests
                                </p>
                            </div>
                            <Switch
                                id="available"
                                checked={isAvailable}
                                onCheckedChange={setIsAvailable}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>
                            Choose how you want to be notified about new pickups and updates
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="email-notifs">Email Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive email alerts for new pickup requests
                                </p>
                            </div>
                            <Switch
                                id="email-notifs"
                                checked={emailNotifs}
                                onCheckedChange={setEmailNotifs}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="push-notifs">Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive push notifications on your device
                                </p>
                            </div>
                            <Switch
                                id="push-notifs"
                                checked={pushNotifs}
                                onCheckedChange={setPushNotifs}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="sms-notifs">SMS Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive text messages for urgent updates
                                </p>
                            </div>
                            <Switch
                                id="sms-notifs"
                                checked={smsNotifs}
                                onCheckedChange={setSmsNotifs}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
