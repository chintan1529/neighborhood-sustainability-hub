"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConversationType } from "@/types/database";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface Participant {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ConversationInfo {
  id: string;
  type: ConversationType;
  title: string | null;
  participants: Participant[];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

interface MessageWithSender extends Message {
  sender: Participant | null;
}

interface ChatInterfaceProps {
  conversationId: string;
  basePath?: string;
}

export function ChatInterface({
  conversationId,
  basePath = "/resident/messages",
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationInfo, setConversationInfo] =
    useState<ConversationInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUserId(user.id);

      // Fetch conversation details
      const { data: conv, error: convError } = await (
        supabase.from("conversations") as any
      )
        .select("id, type, title")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        console.error("Error fetching conversation:", convError);
        router.push(basePath);
        return;
      }

      // Fetch participants (just user_ids)
      const { data: participantData, error: partError } = await (
        supabase.from("conversation_participants") as any
      )
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (partError) {
        console.error("Error fetching participants:", partError);
      }

      // Fetch profiles for other participants
      const otherUserIds = (participantData || [])
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => p.user_id);

      let participantList: Participant[] = [];
      if (otherUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherUserIds);

        participantList = (profilesData || []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }));
      }

      setConversationInfo({
        ...conv,
        participants: participantList,
      });

      // Fetch messages (without profile join)
      const { data: messagesData, error: msgError } = await (
        supabase.from("messages") as any
      )
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("Error fetching messages:", msgError);
      }

      // Fetch profiles for all senders
      const senderIds = Array.from(
        new Set((messagesData || []).map((m: any) => m.sender_id)),
      ) as string[];
      let senderProfiles: Record<string, Participant> = {};

      if (senderIds.length > 0) {
        const { data: sendersData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", senderIds);

        (sendersData || []).forEach((p: any) => {
          senderProfiles[p.id] = {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
          };
        });
      }

      const formattedMessages: MessageWithSender[] = (messagesData || []).map(
        (m: any) => ({
          ...m,
          sender: senderProfiles[m.sender_id] || null,
        }),
      );

      setMessages(formattedMessages);

      // Update last read
      await (supabase.from("conversation_participants") as any)
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, supabase, router, basePath]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender info for new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", (payload.new as Message).sender_id)
            .single();

          const newMsg: MessageWithSender = {
            ...(payload.new as Message),
            sender: profile as Participant | null,
          };

          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await (supabase.from("messages") as any).insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: messageContent,
        message_type: "text",
      });

      if (error) {
        console.error("Error sending message:", error);
        setNewMessage(messageContent); // Restore message on error
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageWithSender[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = formatDate(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  const displayName =
    conversationInfo?.type === "direct"
      ? conversationInfo.participants[0]?.full_name || "Unknown User"
      : conversationInfo?.title || "Conversation";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3 bg-background">
        <Link href={basePath}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {conversationInfo?.participants[0] && (
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={conversationInfo.participants[0].avatar_url || undefined}
            />
            <AvatarFallback>
              {getInitials(conversationInfo.participants[0].full_name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <h2 className="font-semibold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {conversationInfo?.type === "report" ? "Report Discussion" : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage
                                src={msg.sender?.avatar_url || undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.sender?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            </div>
                            <span
                              className={`text-xs text-muted-foreground mt-1 ${isOwn ? "text-right block" : ""}`}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
