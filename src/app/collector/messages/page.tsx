import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Search, FileText, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import type { ConversationType } from "@/types/database";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";

const TYPE_CONFIG: Record<
  ConversationType,
  { label: string; icon: typeof MessageSquare; color: string }
> = {
  direct: {
    label: "Direct Message",
    icon: MessageSquare,
    color: "text-blue-500",
  },
  report: {
    label: "Report Discussion",
    icon: FileText,
    color: "text-green-500",
  },
  support: { label: "Support", icon: HelpCircle, color: "text-purple-500" },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ConversationPreview {
  id: string;
  type: ConversationType;
  title: string | null;
  last_message_at: string;
  other_participant: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    sender_id: string;
  } | null;
  unread_count: number;
}

async function ConversationsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card className="text-center py-10">
        <CardContent>
          <p className="text-muted-foreground">
            Please log in to view messages.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get all conversations the user is part of
  const { data: participations, error: partError } = await (
    supabase.from("conversation_participants") as any
  )
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (partError) {
    console.error("Error fetching conversations:", partError);
    return (
      <Card className="text-center py-10">
        <CardContent>
          <p className="text-muted-foreground">Unable to load messages.</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data to get conversation previews
  const conversations: ConversationPreview[] = [];

  for (const participation of participations || []) {
    // Fetch conversation details
    const { data: conv } = await (supabase.from("conversations") as any)
      .select("id, type, title, last_message_at")
      .eq("id", participation.conversation_id)
      .single();

    if (!conv) continue;

    // Get other participants (just user_ids)
    const { data: otherParticipantsData } = await (
      supabase.from("conversation_participants") as any
    )
      .select("user_id")
      .eq("conversation_id", conv.id)
      .neq("user_id", user.id)
      .limit(1);

    let otherParticipant = null;
    if (otherParticipantsData?.[0]) {
      // Fetch profile for this user
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", otherParticipantsData[0].user_id)
        .single();

      if (profileData) {
        otherParticipant = {
          id: profileData.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
        };
      }
    }

    // Get last message
    const { data: lastMessages } = await (supabase.from("messages") as any)
      .select("content, sender_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMessage = lastMessages?.[0] || null;

    // Get unread count
    const { count: unreadCount } = await (supabase.from("messages") as any)
      .select("id", { count: "exact" })
      .eq("conversation_id", conv.id)
      .gt("created_at", participation.last_read_at || "1970-01-01");

    conversations.push({
      id: conv.id,
      type: conv.type as ConversationType,
      title: conv.title,
      last_message_at: conv.last_message_at,
      other_participant: otherParticipant,
      last_message: lastMessage,
      unread_count: unreadCount || 0,
    });
  }

  // Sort by last message
  conversations.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime(),
  );

  if (conversations.length === 0) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-muted-foreground mb-4">
            Click &quot;New Chat&quot; to start a conversation with a resident or admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const typeConfig = TYPE_CONFIG[conv.type];
        const displayName =
          conv.type === "direct"
            ? conv.other_participant?.full_name || "Unknown User"
            : conv.title || `${typeConfig.label}`;

        return (
          <Link
            key={conv.id}
            href={`/collector/messages/${conv.id}`}
            className="block"
          >
            <Card
              className={`transition-colors hover:bg-muted/50 ${conv.unread_count > 0 ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={conv.other_participant?.avatar_url || undefined}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conv.type === "direct"
                        ? getInitials(conv.other_participant?.full_name || null)
                        : typeConfig.icon === FileText
                          ? "📋"
                          : "💬"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-medium truncate ${conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {displayName}
                        </h4>
                        {conv.type !== "direct" && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-sm truncate ${conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {conv.last_message?.content || "No messages yet"}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge className="ml-2 bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function CollectorMessagesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Chat with residents and admins about waste reports.
          </p>
        </div>
        <NewConversationDialog basePath="/collector/messages" />
      </div>

      {/* Search (placeholder for now) */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search messages..." className="pl-10" disabled />
      </div>

      <Suspense
        fallback={
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <ConversationsContent />
      </Suspense>
    </div>
  );
}
