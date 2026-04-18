import { ChatInterface } from "@/components/messages/chat-interface";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecyclerChatPage({ params }: PageProps) {
  const { id } = await params;

  return <ChatInterface conversationId={id} basePath="/recycler/messages" />;
}
