import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, FileText, ArrowRight, X, Search } from "lucide-react";

interface TeamMemberProfile {
  id: string;
  student_id: string;
  student: {
    first_name: string;
    last_name: string;
    department: string;
    email: string;
    student_id: string;
  };
  research_cell: { name: string } | null;
}

export function CreateTeam() {
  const [loading, setLoading] = useState(true);
  const [existingTeam, setExistingTeam] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [teamMemberProfiles, setTeamMemberProfiles] = useState<TeamMemberProfile[]>([]);
  const [selectedMember2, setSelectedMember2] = useState<TeamMemberProfile | null>(null);
  const [selectedMember3, setSelectedMember3] = useState<TeamMemberProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    member1Name: "",
    member1StudentId: "",
    member1Email: "",
    member1Department: "",
  });

  useEffect(() => {
    checkExistingTeam();
    fetchTeamMemberProfiles();
  }, []);

  const checkExistingTeam = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get current user profile for member 1
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCurrentUserProfile(profile);
      setFormData({
        member1Name: `${profile.first_name} ${profile.last_name}`,
        member1StudentId: profile.student_id || "",
        member1Email: profile.email,
        member1Department: profile.department || "",
      });

      // Check if user is part of any team (as any member, not just creator)
      const { data: teams } = await supabase
        .from("teams")
        .select("*");

      const userTeam = teams?.find(team => 
        team.member1_email === profile.email ||
        team.member2_email === profile.email ||
        team.member3_email === profile.email
      );

      if (userTeam) {
        setExistingTeam(userTeam);
      }
    }
    setLoading(false);
  };

  const fetchTeamMemberProfiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("team_member_profiles")
      .select(`
        id,
        student_id,
        student:profiles!team_member_profiles_student_id_fkey(first_name, last_name, department, email, student_id),
        research_cell:research_cells(name)
      `)
      .neq("student_id", user.id);

    setTeamMemberProfiles(data || []);
  };

  const generateTeamId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TEAM-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const teamId = generateTeamId();

      const { error } = await supabase
        .from("teams")
        .insert({
          team_id: teamId,
          creator_id: user.id,
          member1_name: formData.member1Name,
          member1_student_id: formData.member1StudentId,
          member1_email: formData.member1Email,
          member1_department: formData.member1Department,
          member2_name: selectedMember2 ? `${selectedMember2.student.first_name} ${selectedMember2.student.last_name}` : null,
          member2_student_id: selectedMember2?.student.student_id || null,
          member2_email: selectedMember2?.student.email || null,
          member2_department: selectedMember2?.student.department || null,
          member3_name: selectedMember3 ? `${selectedMember3.student.first_name} ${selectedMember3.student.last_name}` : null,
          member3_student_id: selectedMember3?.student.student_id || null,
          member3_email: selectedMember3?.student.email || null,
          member3_department: selectedMember3?.student.department || null,
        });

      if (error) throw error;

      toast.success("Team created successfully!");
      setShowForm(false);
      checkExistingTeam();
    } catch (error: any) {
      toast.error(error.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show team selection options
  if (!showForm) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Create Team</h2>
          <p className="text-muted-foreground mt-1">Register your thesis team</p>
        </div>

        <Card 
          className={`transition-colors ${!existingTeam ? "hover:border-primary/50 cursor-pointer" : "opacity-60"}`}
          onClick={() => !existingTeam && setShowForm(true)}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Team Registration Form
            </CardTitle>
            <CardDescription>
              {existingTeam 
                ? "You have already registered a team. View details in 'My Team' section." 
                : "Register a new thesis team (up to 3 members)"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!existingTeam && (
              <Button variant="outline" className="w-full">
                Start Registration
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Team Registration</h2>
          <p className="text-muted-foreground mt-1">Register your thesis team (up to 3 members)</p>
        </div>
        <Button variant="outline" onClick={() => setShowForm(false)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Registration Form</CardTitle>
          <CardDescription>
            Member 1 is you. Select additional members from registered students in "Find Team Member".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Member 1 - Current User (Read-only) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Member 1 (You)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.member1Name} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input value={formData.member1StudentId} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.member1Email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={formData.member1Department} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Member 2 - Select from profiles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Member 2 (Optional)</h3>
              {selectedMember2 ? (
                <div className="p-4 bg-muted rounded-lg relative">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2"
                    onClick={() => setSelectedMember2(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <p className="font-medium">{selectedMember2.student.first_name} {selectedMember2.student.last_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember2.student.student_id} • {selectedMember2.student.department}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedMember2.student.email}</p>
                </div>
              ) : (
                <Select onValueChange={(value) => {
                  const member = teamMemberProfiles.find(m => m.id === value);
                  if (member && member.id !== selectedMember3?.id) {
                    setSelectedMember2(member);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member from Find Team Member list" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMemberProfiles
                      .filter(m => m.id !== selectedMember3?.id)
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.student.first_name} {member.student.last_name} - {member.student.department}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              {teamMemberProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  No registered members found. Students need to register in "Find Team Member" first.
                </p>
              )}
            </div>

            {/* Member 3 - Select from profiles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Member 3 (Optional)</h3>
              {selectedMember3 ? (
                <div className="p-4 bg-muted rounded-lg relative">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2"
                    onClick={() => setSelectedMember3(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <p className="font-medium">{selectedMember3.student.first_name} {selectedMember3.student.last_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember3.student.student_id} • {selectedMember3.student.department}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedMember3.student.email}</p>
                </div>
              ) : (
                <Select onValueChange={(value) => {
                  const member = teamMemberProfiles.find(m => m.id === value);
                  if (member && member.id !== selectedMember2?.id) {
                    setSelectedMember3(member);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member from Find Team Member list" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMemberProfiles
                      .filter(m => m.id !== selectedMember2?.id)
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.student.first_name} {member.student.last_name} - {member.student.department}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button type="submit" size="lg" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? "Creating Team..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
