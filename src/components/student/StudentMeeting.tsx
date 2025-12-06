import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Send, CheckCircle, XCircle, Hourglass } from "lucide-react";

export const StudentMeeting = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [supervisorInfo, setSupervisorInfo] = useState<any>(null);
  const [proposedTime, setProposedTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's profile email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    // Get team where user is any member (not just creator)
    const { data: teamsData } = await supabase
      .from("teams")
      .select("*");

    const teamData = teamsData?.find(team => 
      team.member1_email === profile.email ||
      team.member2_email === profile.email ||
      team.member3_email === profile.email
    );

    if (teamData) {
      setMyTeam(teamData);

      // Get accepted application for this team
      const { data: appData } = await supabase
        .from("applications")
        .select(`
          *,
          supervisor_id
        `)
        .eq("team_id", teamData.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (appData?.supervisor_id) {
        // Fetch supervisor details separately
        const { data: supData } = await supabase
          .from("supervisors")
          .select("id, leisure_time")
          .eq("id", appData.supervisor_id)
          .single();

        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", appData.supervisor_id)
          .single();

        if (supData) {
          setSupervisorInfo({
            ...supData,
            profiles: profileData
          });

          // Fetch meetings for this team
          const { data: meetingsData } = await supabase
            .from("meetings")
            .select("*")
            .eq("team_id", teamData.id)
            .order("created_at", { ascending: false });

          setMeetings(meetingsData || []);
        }
      }
    }

    setLoading(false);
  };

  const handleScheduleMeeting = async () => {
    if (!proposedTime.trim()) {
      toast.error("Please enter a proposed meeting time");
      return;
    }

    if (!myTeam || !supervisorInfo) {
      toast.error("No accepted application found");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("meetings").insert({
      team_id: myTeam.id,
      supervisor_id: supervisorInfo.id,
      proposed_time: proposedTime,
      status: "pending"
    });

    if (error) {
      toast.error("Failed to schedule meeting");
      setSubmitting(false);
      return;
    }

    // Notify supervisor
    await supabase.from("notifications").insert({
      user_id: supervisorInfo.id,
      title: "New Meeting Request",
      content: `Team ${myTeam.team_id} has requested a meeting at: ${proposedTime}`,
      type: "meeting_request"
    });

    toast.success("Meeting request sent");
    setProposedTime("");
    setSubmitting(false);
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Hourglass className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!supervisorInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Schedule Meeting</h2>
          <p className="text-muted-foreground mt-1">Request meetings with your supervisor</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You need an accepted thesis application to schedule meetings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Schedule Meeting</h2>
        <p className="text-muted-foreground mt-1">Request meetings with your supervisor</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Supervisor's Available Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">
              {supervisorInfo.profiles?.first_name} {supervisorInfo.profiles?.last_name}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Leisure Time:</strong> {supervisorInfo.leisure_time || "Not specified"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request New Meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Proposed Time (based on supervisor's leisure time)</Label>
            <Input
              placeholder="e.g., Monday 3:00 PM, or Dec 15 at 2:00 PM"
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
            />
          </div>
          <Button onClick={handleScheduleMeeting} disabled={submitting} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Sending..." : "Send Meeting Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeting History</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No meetings scheduled yet</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{meeting.proposed_time}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested on {new Date(meeting.created_at).toLocaleDateString()}
                    </p>
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
