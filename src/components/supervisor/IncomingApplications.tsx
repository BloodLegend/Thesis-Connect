import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Check, X, Users } from "lucide-react";

export const IncomingApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        teams (*)
      `)
      .eq("supervisor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch applications");
      return;
    }

    setApplications(data || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (applicationId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", applicationId);

    if (error) {
      toast.error("Failed to update application");
      return;
    }

    // Get application details for notification
    const app = applications.find(a => a.id === applicationId);
    if (app?.teams) {
      // Collect all member emails
      const memberEmails = [
        app.teams.member1_email,
        app.teams.member2_email,
        app.teams.member3_email
      ].filter(Boolean);

      // Get user IDs for all team members
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", memberEmails);

      // Send notification to all team members
      if (memberProfiles && memberProfiles.length > 0) {
        const notifications = memberProfiles.map(profile => ({
          user_id: profile.id,
          title: `Application ${status === "accepted" ? "Accepted" : "Rejected"}`,
          content: `Your application for "${app.project_title}" has been ${status}.`,
          type: "application_status"
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    toast.success(`Application ${status}`);
    fetchApplications();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Incoming Applications</h1>
        <p className="text-muted-foreground mt-1">Review and manage thesis/project applications</p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No applications received yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{app.project_title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team ID: {app.teams?.team_id}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Project Description</h4>
                  <p className="text-sm text-muted-foreground">{app.project_description}</p>
                </div>

                {app.teams && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{app.teams.member1_name}</p>
                        <p className="text-muted-foreground">{app.teams.member1_student_id}</p>
                        <p className="text-muted-foreground">{app.teams.member1_department}</p>
                      </div>
                      {app.teams.member2_name && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{app.teams.member2_name}</p>
                          <p className="text-muted-foreground">{app.teams.member2_student_id}</p>
                          <p className="text-muted-foreground">{app.teams.member2_department}</p>
                        </div>
                      )}
                      {app.teams.member3_name && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{app.teams.member3_name}</p>
                          <p className="text-muted-foreground">{app.teams.member3_student_id}</p>
                          <p className="text-muted-foreground">{app.teams.member3_department}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {app.status === "pending" && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleStatusUpdate(app.id, "accepted")}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(app.id, "rejected")}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
