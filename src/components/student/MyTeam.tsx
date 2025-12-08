import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle } from "lucide-react";
import { TeamGroupChat } from "../shared/TeamGroupChat";

export function MyTeam() {
  const [team, setTeam] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
        }
      }
    }

    setLoading(false);
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

          {supervisor && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Supervisor</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{supervisor.first_name} {supervisor.last_name}</p>
                <p className="text-sm text-muted-foreground">{supervisor.email}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Registered on: {new Date(team.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Group Chat with Team & Supervisor */}
      {application && supervisor ? (
        <TeamGroupChat
          teamId={team.id}
          teamName={team.team_id}
          showBackButton={false}
        />
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
