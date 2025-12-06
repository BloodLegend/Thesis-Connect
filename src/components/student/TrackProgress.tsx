import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";

export function TrackProgress() {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [progressUpdates, setProgressUpdates] = useState<any[]>([]);
  const [draftContent, setDraftContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchProgressUpdates(selectedApp.id);
    }
  }, [selectedApp]);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to find their email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Get all teams where user is a member
      const { data: allTeams } = await supabase
        .from("teams")
        .select("id");

      const { data: teamsData } = await supabase
        .from("teams")
        .select("*");

      const userTeamIds = teamsData?.filter(team => 
        team.member1_email === profile.email ||
        team.member2_email === profile.email ||
        team.member3_email === profile.email
      ).map(t => t.id) || [];

      if (userTeamIds.length === 0) {
        setApplications([]);
        return;
      }

      const { data } = await supabase
        .from("applications")
        .select(`
          *,
          team:teams(team_id, member1_name, member2_name, member3_name),
          supervisor:supervisors(profile:profiles(first_name, last_name))
        `)
        .eq("status", "accepted")
        .in("team_id", userTeamIds)
        .order("created_at", { ascending: false });

      setApplications(data || []);
      if (data && data.length > 0) {
        setSelectedApp(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load applications");
    }
  };

  const fetchProgressUpdates = async (applicationId: string) => {
    try {
      const { data } = await supabase
        .from("progress_updates")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      setProgressUpdates(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitDraft = async () => {
    if (!selectedApp || !draftContent.trim()) {
      toast.error("Please enter draft content");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("progress_updates")
        .insert({
          application_id: selectedApp.id,
          draft_content: draftContent,
          status: "draft_submitted",
          updated_by: user.id,
        });

      if (error) throw error;

      // Notify supervisor
      await supabase.from("notifications").insert({
        user_id: selectedApp.supervisor_id,
        title: "New Draft Submitted",
        content: `${selectedApp.team.team_id} has submitted a new draft for ${selectedApp.project_title}`,
        type: "progress",
      });

      toast.success("Draft submitted successfully!");
      setDraftContent("");
      fetchProgressUpdates(selectedApp.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "accepted") return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === "rejected") return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-warning" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "accepted") return "bg-success/10 text-success";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  if (applications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Track Progress</h2>
          <p className="text-muted-foreground mt-1">Monitor your thesis project progress</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No accepted applications yet. Apply for a thesis project to track your progress here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Track Progress</h2>
        <p className="text-muted-foreground mt-1">Monitor and update your thesis project</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Your Projects</h3>
          {applications.map((app) => (
            <Card
              key={app.id}
              className={`cursor-pointer transition-colors ${
                selectedApp?.id === app.id ? "border-primary" : ""
              }`}
              onClick={() => setSelectedApp(app)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{app.project_title}</CardTitle>
                <CardDescription className="text-sm">
                  {app.team?.team_id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-xs">
                  {app.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="md:col-span-2 space-y-6">
          {selectedApp && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedApp.project_title}</CardTitle>
                  <CardDescription>
                    Supervisor: {selectedApp.supervisor?.profile?.first_name}{" "}
                    {selectedApp.supervisor?.profile?.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="draftContent">Submit New Draft</Label>
                    <Textarea
                      id="draftContent"
                      placeholder="Enter your draft content, progress updates, or chapter text here..."
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="min-h-[150px] mt-2"
                    />
                  </div>
                  <Button onClick={handleSubmitDraft} disabled={loading}>
                    {loading ? "Submitting..." : "Submit Draft"}
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h3 className="font-semibold mb-4">Progress History</h3>
                {progressUpdates.length === 0 ? (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-center text-muted-foreground text-sm">
                        No progress updates yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {progressUpdates.map((update) => (
                      <Card key={update.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(update.status)}>
                              {update.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(update.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {update.draft_content && (
                            <div>
                              <p className="text-sm font-medium mb-1">Draft Content:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {update.draft_content}
                              </p>
                            </div>
                          )}
                          {update.supervisor_comments && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-1">Supervisor Comments:</p>
                              <p className="text-sm text-muted-foreground">
                                {update.supervisor_comments}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
