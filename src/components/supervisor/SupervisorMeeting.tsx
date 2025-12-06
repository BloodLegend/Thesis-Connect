import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock, Users } from "lucide-react";

export const SupervisorMeeting = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        teams (team_id, member1_name, member2_name, member3_name, member1_email, member2_email, member3_email, creator_id)
      `)
      .eq("supervisor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch meetings");
      return;
    }

    setMeetings(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (meetingId: string, status: string, team: any) => {
    const { error } = await supabase
      .from("meetings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", meetingId);

    if (error) {
      toast.error("Failed to update meeting status");
      return;
    }

    // Collect all member emails
    const memberEmails = [
      team?.member1_email,
      team?.member2_email,
      team?.member3_email
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
        title: `Meeting ${status === "accepted" ? "Accepted" : "Rejected"}`,
        content: `Your meeting request has been ${status}.`,
        type: "meeting_response"
      }));

      await supabase.from("notifications").insert(notifications);
    }

    toast.success(`Meeting ${status}`);
    fetchMeetings();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-500">Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const pendingMeetings = meetings.filter(m => m.status === "pending");
  const pastMeetings = meetings.filter(m => m.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meeting Requests</h1>
        <p className="text-muted-foreground mt-1">Manage meeting requests from your teams</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Requests ({pendingMeetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMeetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending meeting requests</p>
          ) : (
            <div className="space-y-4">
              {pendingMeetings.map((meeting) => (
                <div key={meeting.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">Team: {meeting.teams?.team_id}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Members: {meeting.teams?.member1_name}
                        {meeting.teams?.member2_name && `, ${meeting.teams.member2_name}`}
                        {meeting.teams?.member3_name && `, ${meeting.teams.member3_name}`}
                      </p>
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      <strong>Proposed Time:</strong> {meeting.proposed_time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested on {new Date(meeting.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(meeting.id, "accepted", meeting.teams)}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus(meeting.id, "rejected", meeting.teams)}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeting History</CardTitle>
        </CardHeader>
        <CardContent>
          {pastMeetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No past meetings</p>
          ) : (
            <div className="space-y-3">
              {pastMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Team: {meeting.teams?.team_id}</p>
                    <p className="text-sm text-muted-foreground">{meeting.proposed_time}</p>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
