import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Send } from "lucide-react";

export function MyTeam() {
  const [team, setTeam] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Get user's profile to find their email
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profileData) return;

    const userEmail = profileData.email;

    // Get team where user is creator OR a member (check by email)
    const { data: teamsData } = await supabase
      .from("teams")
      .select("*");

    // Find team where user is creator or any member
    const teamData = teamsData?.find(team => 
      team.creator_id === user.id ||
      team.member1_email === userEmail ||
      team.member2_email === userEmail ||
      team.member3_email === userEmail
    );

    if (teamData) {
      setTeam(teamData);

      // Get accepted application
      const { data: appData } = await supabase
        .from("applications")
        .select("*")
        .eq("team_id", teamData.id)
        .eq("status", "accepted")
        .single();

      if (appData) {
        setApplication(appData);

        // Get supervisor profile
        const { data: supProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", appData.supervisor_id)
          .single();

        if (supProfile) {
          setSupervisor(supProfile);
          setupRealtimeSubscription(user.id, appData.supervisor_id);
          fetchMessages(user.id, appData.supervisor_id);
        }
      }
    }

    setLoading(false);
  };

  const fetchMessages = async (userId: string, supervisorId: string) => {
    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${supervisorId}),and(sender_id.eq.${supervisorId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const setupRealtimeSubscription = (userId: string, supervisorId: string) => {
    supabase
      .channel("student-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchMessages(userId, supervisorId)
      )
      .subscribe();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !supervisor) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: supervisor.id,
      content: newMessage
    });

    if (!error) {
      setNewMessage("");
    }
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

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">My Team</h2>
          <p className="text-muted-foreground mt-1">View your team details and chat with supervisor</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You haven't created a team yet. Go to "Create Team" to register.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">My Team</h2>
        <p className="text-muted-foreground mt-1">View your team details and chat with supervisor</p>
      </div>

      {/* Team Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Team ID</p>
            <p className="font-semibold">{team.team_id}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Team Members</p>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{team.member1_name}</p>
                <p className="text-sm text-muted-foreground">
                  {team.member1_student_id} • {team.member1_department}
                </p>
                <p className="text-sm text-muted-foreground">{team.member1_email}</p>
              </div>
              {team.member2_name && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{team.member2_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {team.member2_student_id} • {team.member2_department}
                  </p>
                  <p className="text-sm text-muted-foreground">{team.member2_email}</p>
                </div>
              )}
              {team.member3_name && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{team.member3_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {team.member3_student_id} • {team.member3_department}
                  </p>
                  <p className="text-sm text-muted-foreground">{team.member3_email}</p>
                </div>
              )}
            </div>
          </div>

          {application && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Thesis Project</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{application.project_title}</p>
                <Badge className="mt-2 bg-green-500">Accepted</Badge>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Registered on: {new Date(team.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Chat with Supervisor */}
      {supervisor ? (
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="w-5 h-5" />
              Chat with {supervisor.first_name} {supervisor.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chat will be available after your thesis application is accepted</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
