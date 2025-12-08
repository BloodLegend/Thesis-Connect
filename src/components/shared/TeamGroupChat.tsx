import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, ArrowLeft, Users } from "lucide-react";

interface TeamGroupChatProps {
  teamId: string;
  teamName: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const TeamGroupChat = ({ teamId, teamName, onBack, showBackButton = true }: TeamGroupChatProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    setupRealtimeSubscription();
    
    return () => {
      supabase.removeChannel(supabase.channel(`team-group-chat-${teamId}`));
    };
  }, [teamId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Fetch all messages for this team (group chat)
    const { data: messagesData, error } = await (supabase as any)
      .from("messages")
      .select("id, content, created_at, sender_id")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }

    // Fetch sender profiles separately
    const senderIds = [...new Set((messagesData || []).map((m: any) => m.sender_id).filter(Boolean))];
    
    let profilesMap: Record<string, { first_name: string; last_name: string }> = {};
    if (senderIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", senderIds as string[]);
      
      profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = { first_name: p.first_name, last_name: p.last_name };
        return acc;
      }, {} as Record<string, { first_name: string; last_name: string }>);
    }

    // Merge messages with sender info
    const messagesWithSender = (messagesData || []).map((m: any) => ({
      ...m,
      sender: m.sender_id ? profilesMap[m.sender_id] : null
    }));

    setMessages(messagesWithSender);
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`team-group-chat-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      team_id: teamId,
      content: newMessage
    } as any);

    if (error) {
      toast.error("Failed to send message");
      setSending(false);
      return;
    }

    setNewMessage("");
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Team Chat - {teamName}
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground ml-9">
          Group chat with all team members and supervisor
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              <p className="text-xs text-muted-foreground mt-1">All team members and supervisor can see messages here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.sender_id === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.sender?.first_name} {message.sender?.last_name}
                    </p>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
