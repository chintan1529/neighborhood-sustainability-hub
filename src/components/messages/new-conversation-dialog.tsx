'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, MessageSquare, User, Shield, Truck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof User; color: string }> = {
    admin: { label: 'Admin', icon: Shield, color: 'bg-purple-100 text-purple-700' },
    collector: { label: 'Collector', icon: Truck, color: 'bg-green-100 text-green-700' },
    resident: { label: 'Resident', icon: User, color: 'bg-blue-100 text-blue-700' },
};

function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface NewConversationDialogProps {
    basePath?: string;
}

export function NewConversationDialog({ basePath = '/resident/messages' }: NewConversationDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            fetchProfiles();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            setFilteredProfiles(
                profiles.filter(p =>
                    p.full_name?.toLowerCase().includes(query) ||
                    p.role.toLowerCase().includes(query)
                )
            );
        } else {
            setFilteredProfiles(profiles);
        }
    }, [searchQuery, profiles]);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Fetch all profiles except current user
            // Prioritize admins and collectors
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .neq('id', user.id)
                .order('role', { ascending: true })
                .order('full_name', { ascending: true });

            if (error) {
                console.error('Error fetching profiles:', error);
                return;
            }

            // Sort to show admins first, then collectors, then residents
            const sorted = (data || []).sort((a, b) => {
                const order = { admin: 0, collector: 1, resident: 2 };
                return (order[a.role as keyof typeof order] || 3) - (order[b.role as keyof typeof order] || 3);
            });

            setProfiles(sorted);
            setFilteredProfiles(sorted);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startConversation = async (profile: Profile) => {
        if (!currentUserId) return;

        setIsCreating(profile.id);
        try {
            // Check if conversation already exists between these users
            const { data: existingParticipations, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', currentUserId);

            if (partError) {
                console.error('Error fetching participations:', partError);
            }

            // For each of current user's conversations, check if the other user is also there
            for (const participation of existingParticipations || []) {
                const { data: otherParticipant } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', participation.conversation_id)
                    .eq('user_id', profile.id)
                    .maybeSingle(); // Use maybeSingle to avoid errors when no row found

                if (otherParticipant) {
                    // Found existing conversation, navigate to it
                    router.push(`${basePath}/${participation.conversation_id}`);
                    setIsOpen(false);
                    setIsCreating(null);
                    return;
                }
            }

            // No existing conversation, create new one
            const { data: newConv, error: convError } = await (supabase
                .from('conversations') as any)
                .insert({
                    type: 'direct',
                    title: null,
                })
                .select('id')
                .single();

            if (convError || !newConv) {
                console.error('Error creating conversation:', convError);
                setIsCreating(null);
                return;
            }

            // Add both participants
            const { error: participantError } = await (supabase
                .from('conversation_participants') as any)
                .insert([
                    { conversation_id: newConv.id, user_id: currentUserId, role: 'owner' },
                    { conversation_id: newConv.id, user_id: profile.id, role: 'member' },
                ]);

            if (participantError) {
                console.error('Error adding participants:', participantError);
                setIsCreating(null);
                return;
            }

            // Navigate to the new conversation
            router.push(`${basePath}/${newConv.id}`);
            setIsOpen(false);
        } catch (error) {
            console.error('Error starting conversation:', error);
        } finally {
            setIsCreating(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Start a New Conversation</DialogTitle>
                    <DialogDescription>
                        Select a person to chat with. Admins and collectors can help with your waste reports.
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Profiles List */}
                <ScrollArea className="h-[300px] -mx-6 px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? 'No profiles match your search' : 'No profiles available'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProfiles.map((profile) => {
                                const roleConfig = ROLE_CONFIG[profile.role] || ROLE_CONFIG.resident;
                                const RoleIcon = roleConfig.icon;

                                return (
                                    <button
                                        key={profile.id}
                                        onClick={() => startConversation(profile)}
                                        disabled={isCreating !== null}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={profile.avatar_url || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {getInitials(profile.full_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {profile.full_name || 'Unknown User'}
                                            </p>
                                            <Badge variant="secondary" className={`text-xs ${roleConfig.color}`}>
                                                <RoleIcon className="h-3 w-3 mr-1" />
                                                {roleConfig.label}
                                            </Badge>
                                        </div>
                                        {isCreating === profile.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
