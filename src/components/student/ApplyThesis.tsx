import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export function ApplyThesis() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    teamId: "",
    supervisorId: "",
    projectTitle: "",
    projectDescription: "",
  });

  useEffect(() => {
    fetchUserTeams();
    fetchSupervisors();
  }, []);

  const fetchUserTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Get teams where user is any member
      const { data: allTeams } = await supabase
        .from("teams")
        .select("*");

      const userTeams = allTeams?.filter(team => 
        team.member1_email === profile.email ||
        team.member2_email === profile.email ||
        team.member3_email === profile.email
      ) || [];

      setTeams(userTeams);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const { data } = await supabase
        .from("supervisors")
        .select(`
          *,
          profile:profiles!supervisors_id_fkey(first_name, last_name, department)
        `);

      setSupervisors(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("applications")
        .insert({
          team_id: formData.teamId,
          supervisor_id: formData.supervisorId,
          project_title: formData.projectTitle,
          project_description: formData.projectDescription,
          status: "pending",
        });

      if (error) throw error;

      // Create notification for supervisor
      await supabase.from("notifications").insert({
        user_id: formData.supervisorId,
        title: "New Thesis Application",
        content: `A team has applied to work on: ${formData.projectTitle}`,
        type: "application",
      });

      toast.success("Application submitted successfully!");
      setFormData({
        teamId: "",
        supervisorId: "",
        projectTitle: "",
        projectDescription: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Apply for Thesis/Project</h2>
        <p className="text-muted-foreground mt-1">Submit your thesis proposal to a supervisor</p>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Teams Found</CardTitle>
            <CardDescription>
              You need to create a team before applying for a thesis project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Go to "Create Team" section to register your team first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Thesis Application Form</CardTitle>
                <CardDescription>
                  Fill in your proposal details and select a supervisor
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="teamId">Select Your Team *</Label>
                <Select
                  value={formData.teamId}
                  onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.team_id} - {team.member1_name}
                        {team.member2_name && `, ${team.member2_name}`}
                        {team.member3_name && `, ${team.member3_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisorId">Select Supervisor *</Label>
                <Select
                  value={formData.supervisorId}
                  onValueChange={(value) => setFormData({ ...formData, supervisorId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.profile?.first_name} {supervisor.profile?.last_name}
                        {supervisor.profile?.department && ` - ${supervisor.profile.department}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project/Thesis Title *</Label>
                <Input
                  id="projectTitle"
                  placeholder="Enter your proposed title"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description/Abstract *</Label>
                <Textarea
                  id="projectDescription"
                  placeholder="Describe your proposed project, research questions, methodology, and expected outcomes..."
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  required
                  className="min-h-[200px]"
                />
              </div>

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
