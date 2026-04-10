import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from './settings-client';

export default async function CollectorSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_available, notification_preferences')
        .eq('id', user.id)
        .single();

    if (!profile) redirect('/auth/login');

    return (
        <SettingsPageClient
            profile={{
                is_available: profile.is_available ?? true,
                notification_preferences: (profile.notification_preferences as { email: boolean; push: boolean; sms: boolean } | null) ?? {
                    email: true,
                    push: true,
                    sms: false,
                },
            }}
            userId={user.id}
        />
    );
}
