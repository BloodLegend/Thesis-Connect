import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Phone, Building2 } from "lucide-react";

export function FindTeamMember() {
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [researchCells, setResearchCells] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState("");
  const [formData, setFormData] = useState({
    researchCellId: "",
    contactInfo: "",
  });

  useEffect(() => {
    checkProfile();
    fetchResearchCells();
  }, []);

  useEffect(() => {
    if (hasProfile) {
      fetchTeamMembers();
    }
  }, [hasProfile, selectedCell]);

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("team_member_profiles")
        .select("*")
        .eq("student_id", user.id)
        .single();

      setHasProfile(!!data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResearchCells = async () => {
    const { data } = await supabase
      .from("research_cells")
      .select("*")
      .order("name");
    setResearchCells(data || []);
  };

  const fetchTeamMembers = async () => {
    try {
      let query = supabase
        .from("team_member_profiles")
        .select(`
          *,
          student:profiles!team_member_profiles_student_id_fkey(first_name, last_name, department, email),
          research_cell:research_cells(name)
        `);

      if (selectedCell && selectedCell !== "all") {
        query = query.eq("preferred_research_cell_id", selectedCell);
      }

      const { data } = await query;
      setTeamMembers(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("team_member_profiles")
        .insert({
          student_id: user.id,
          preferred_research_cell_id: formData.researchCellId,
          contact_info: formData.contactInfo,
        });

      if (error) throw error;

      toast.success("Profile created successfully!");
      setHasProfile(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Find Team Member</h2>
          <p className="text-muted-foreground mt-1">Complete your profile to find teammates</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Team Member Profile</CardTitle>
            <CardDescription>
              Fill out this form to appear in the team member directory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="researchCell">Preferred Research Cell *</Label>
                <Select
                  value={formData.researchCellId}
                  onValueChange={(value) => setFormData({ ...formData, researchCellId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a research cell" />
                  </SelectTrigger>
                  <SelectContent>
                    {researchCells.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo">Additional Contact Info</Label>
                <Input
                  id="contactInfo"
                  placeholder="Discord, WhatsApp, etc."
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Find Team Member</h2>
        <p className="text-muted-foreground mt-1">Connect with potential teammates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Research Cell</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCell} onValueChange={setSelectedCell}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="All research cells" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All research cells</SelectItem>
              {researchCells.map((cell) => (
                <SelectItem key={cell.id} value={cell.id}>
                  {cell.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamMembers.map((member: any) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle className="text-xl">
                {member.student?.first_name} {member.student?.last_name}
              </CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-2">
                  {member.research_cell?.name || "No preference"}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.student?.department && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{member.student.department}</span>
                </div>
              )}
              {member.student?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{member.student.email}</span>
                </div>
              )}
              {member.contact_info && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{member.contact_info}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No team members found. Try selecting a different research cell.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
