import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Send, MessageCircle, FileIcon, Download } from "lucide-react";
import { TeamChat } from "./TeamChat";

export const SupervisorTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [activeChat, setActiveChat] = useState<{ teamId: string; teamName: string } | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        teams (*),
        progress_updates (*)
      `)
      .eq("supervisor_id", user.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch teams");
      return;
    }

    setTeams(data || []);
    setLoading(false);
  };

  const handleAddComment = async (applicationId: string, team: any) => {
    const comment = comments[applicationId];
    if (!comment?.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("progress_updates").insert({
      application_id: applicationId,
      supervisor_comments: comment,
      updated_by: user.id
    });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    // Notify all team members
    const memberEmails = [
      team.member1_email,
      team.member2_email,
      team.member3_email
    ].filter(Boolean);

    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("email", memberEmails);

    if (memberProfiles && memberProfiles.length > 0) {
      const notifications = memberProfiles.map(profile => ({
        user_id: profile.id,
        title: "New Supervisor Comment",
        content: `Your supervisor has added a comment on your thesis progress.`,
        type: "progress_update"
      }));

      await supabase.from("notifications").insert(notifications);
    }

    toast.success("Comment added");
    setComments({ ...comments, [applicationId]: "" });
    fetchTeams();
  };

  const handleDownloadFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('thesis-drafts')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Show chat if active
  if (activeChat) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
          <p className="text-muted-foreground mt-1">Track progress of accepted teams</p>
        </div>
        <TeamChat
          teamId={activeChat.teamId}
          teamName={activeChat.teamName}
          onBack={() => setActiveChat(null)}
        />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      proposal_submitted: "bg-blue-500",
      proposal_approved: "bg-green-500",
      in_progress: "bg-yellow-500",
      draft_submitted: "bg-purple-500",
      revision_needed: "bg-orange-500",
      final_submitted: "bg-indigo-500",
      completed: "bg-emerald-500"
    };
    return <Badge className={statusColors[status] || "bg-gray-500"}>{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
        <p className="text-muted-foreground mt-1">Track progress of accepted teams</p>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No accepted teams yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{team.project_title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team ID: {team.teams?.team_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {team.progress_updates?.length > 0 && 
                      getStatusBadge(team.progress_updates[team.progress_updates.length - 1].status)
                    }
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveChat({ teamId: team.teams?.id, teamName: team.teams?.team_id })}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{team.teams?.member1_name}</p>
                    <p className="text-muted-foreground">{team.teams?.member1_email}</p>
                  </div>
                  {team.teams?.member2_name && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{team.teams.member2_name}</p>
                      <p className="text-muted-foreground">{team.teams.member2_email}</p>
                    </div>
                  )}
                  {team.teams?.member3_name && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{team.teams.member3_name}</p>
                      <p className="text-muted-foreground">{team.teams.member3_email}</p>
                    </div>
                  )}
                </div>

                {team.progress_updates?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Progress History
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {team.progress_updates.map((update: any) => (
                        <div key={update.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                          {update.draft_content && (
                            <p className="mb-2"><strong>Draft:</strong> {update.draft_content}</p>
                          )}
                          {update.file_url && (
                            <div className="flex items-center gap-2 mb-2">
                              <FileIcon className="w-4 h-4 text-muted-foreground" />
                              <span>Attached file</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(update.file_url)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          )}
                          {update.supervisor_comments && (
                            <p className="text-primary"><strong>Supervisor:</strong> {update.supervisor_comments}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(update.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="Add feedback or comments..."
                    value={comments[team.id] || ""}
                    onChange={(e) => setComments({ ...comments, [team.id]: e.target.value })}
                    rows={3}
                  />
                  <Button 
                    onClick={() => handleAddComment(team.id, team.teams)}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
