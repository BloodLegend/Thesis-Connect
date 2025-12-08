import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, MessageSquare, Send, MessageCircle, FileIcon, Download, 
  Search, Filter, ChevronDown, ChevronUp, X
} from "lucide-react";
import { TeamGroupChat } from "../shared/TeamGroupChat";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const SupervisorTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [activeChat, setActiveChat] = useState<{ teamId: string; teamName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

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

  const getLatestStatus = (progressUpdates: any[]) => {
    if (!progressUpdates || progressUpdates.length === 0) return null;
    return progressUpdates[progressUpdates.length - 1].status;
  };

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
    return <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>{status.replace(/_/g, " ")}</Badge>;
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teams?.team_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teams?.member1_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teams?.member2_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teams?.member3_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const latestStatus = getLatestStatus(team.progress_updates);
    const matchesStatus = statusFilter === "all" || latestStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (activeChat) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
          <p className="text-muted-foreground mt-1">Track progress of accepted teams</p>
        </div>
        <TeamGroupChat
          teamId={activeChat.teamId}
          teamName={activeChat.teamName}
          onBack={() => setActiveChat(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
        <p className="text-muted-foreground mt-1">Track progress of accepted teams</p>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by project, team ID, or member name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="proposal_submitted">Proposal Submitted</SelectItem>
                <SelectItem value="proposal_approved">Proposal Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="draft_submitted">Draft Submitted</SelectItem>
                <SelectItem value="revision_needed">Revision Needed</SelectItem>
                <SelectItem value="final_submitted">Final Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredTeams.length !== teams.length && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredTeams.length} of {teams.length} teams
          </p>
        )}
      </Card>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No accepted teams yet</p>
          </CardContent>
        </Card>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No teams match your search criteria</p>
            <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-3 pr-4">
            {filteredTeams.map((team) => {
              const latestStatus = getLatestStatus(team.progress_updates);
              const isExpanded = expandedTeam === team.id;
              
              return (
                <Collapsible key={team.id} open={isExpanded} onOpenChange={() => setExpandedTeam(isExpanded ? null : team.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <Users className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-semibold truncate">{team.project_title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Team: {team.teams?.team_id} • {team.teams?.member1_name}
                              {team.teams?.member2_name && `, ${team.teams.member2_name}`}
                              {team.teams?.member3_name && `, ${team.teams.member3_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {latestStatus && getStatusBadge(latestStatus)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChat({ teamId: team.teams?.id, teamName: team.teams?.team_id });
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 border-t">
                        {/* Team Members */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-medium text-sm">{team.teams?.member1_name}</p>
                            <p className="text-xs text-muted-foreground">{team.teams?.member1_email}</p>
                          </div>
                          {team.teams?.member2_name && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="font-medium text-sm">{team.teams.member2_name}</p>
                              <p className="text-xs text-muted-foreground">{team.teams.member2_email}</p>
                            </div>
                          )}
                          {team.teams?.member3_name && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="font-medium text-sm">{team.teams.member3_name}</p>
                              <p className="text-xs text-muted-foreground">{team.teams.member3_email}</p>
                            </div>
                          )}
                        </div>

                        {/* Progress History */}
                        {team.progress_updates?.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-medium flex items-center gap-2 text-sm">
                              <MessageSquare className="w-4 h-4" />
                              Progress History ({team.progress_updates.length})
                            </h4>
                            <ScrollArea className="h-32">
                              <div className="space-y-2 pr-4">
                                {team.progress_updates.map((update: any) => (
                                  <div key={update.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                                    {update.draft_content && (
                                      <p className="mb-1"><strong>Draft:</strong> {update.draft_content}</p>
                                    )}
                                    {update.file_url && (
                                      <div className="flex items-center gap-2 mb-1">
                                        <FileIcon className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-xs">Attached file</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2"
                                          onClick={() => handleDownloadFile(update.file_url)}
                                        >
                                          <Download className="w-3 h-3 mr-1" />
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
                            </ScrollArea>
                          </div>
                        )}

                        {/* Add Comment */}
                        <div className="mt-4 space-y-2 pt-4 border-t">
                          <Textarea
                            placeholder="Add feedback or comments..."
                            value={comments[team.id] || ""}
                            onChange={(e) => setComments({ ...comments, [team.id]: e.target.value })}
                            rows={2}
                            className="resize-none"
                          />
                          <Button 
                            onClick={() => handleAddComment(team.id, team.teams)}
                            size="sm"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Comment
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
