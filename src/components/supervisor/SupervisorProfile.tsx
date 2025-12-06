import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Edit2, X } from "lucide-react";

export const SupervisorProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [supervisorData, setSupervisorData] = useState<any>(null);
  const [researchCells, setResearchCells] = useState<any[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    department: "",
    research_interests: "",
    publications: "",
    leisure_time: ""
  });

  useEffect(() => {
    fetchProfile();
    fetchResearchCells();
  }, []);

  const fetchResearchCells = async () => {
    const { data } = await supabase.from("research_cells").select("*").order("name");
    setResearchCells(data || []);
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: supData } = await supabase
      .from("supervisors")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get supervisor's research cells
    const { data: cellLinks } = await supabase
      .from("supervisor_research_cells")
      .select("research_cell_id")
      .eq("supervisor_id", user.id);

    if (profileData) {
      setProfile(profileData);
      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        phone_number: profileData.phone_number || "",
        department: profileData.department || "",
        research_interests: supData?.research_interests || "",
        publications: supData?.publications ? JSON.stringify(supData.publications, null, 2) : "[]",
        leisure_time: supData?.leisure_time || ""
      });
    }

    setSupervisorData(supData);
    setSelectedCells(cellLinks?.map(l => l.research_cell_id) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not found");
      setSaving(false);
      return;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        department: formData.department,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      toast.error("Failed to update profile");
      setSaving(false);
      return;
    }

    // Parse publications
    let publications = [];
    try {
      publications = JSON.parse(formData.publications);
    } catch {
      toast.error("Invalid publications JSON format");
      setSaving(false);
      return;
    }

    // Check if supervisor record exists, create if not
    if (supervisorData) {
      const { error: supError } = await supabase
        .from("supervisors")
        .update({
          research_interests: formData.research_interests,
          publications: publications,
          leisure_time: formData.leisure_time
        })
        .eq("id", user.id);

      if (supError) {
        console.error("Supervisor update error:", supError);
        toast.error("Failed to update supervisor info");
        setSaving(false);
        return;
      }
    } else {
      // Create supervisor record if it doesn't exist
      const { error: insertError } = await supabase
        .from("supervisors")
        .insert({
          id: user.id,
          research_interests: formData.research_interests,
          publications: publications,
          leisure_time: formData.leisure_time
        });

      if (insertError) {
        console.error("Supervisor insert error:", insertError);
        toast.error("Failed to create supervisor info");
        setSaving(false);
        return;
      }
    }

    // Update research cells - delete existing and insert new
    await supabase
      .from("supervisor_research_cells")
      .delete()
      .eq("supervisor_id", user.id);

    if (selectedCells.length > 0) {
      const links = selectedCells.map(cellId => ({
        supervisor_id: user.id,
        research_cell_id: cellId
      }));
      await supabase.from("supervisor_research_cells").insert(links);
    }

    toast.success("Profile updated successfully");
    setIsEditing(false);
    setSaving(false);
    fetchProfile();
  };

  const toggleResearchCell = (cellId: string) => {
    setSelectedCells(prev =>
      prev.includes(cellId)
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone_number: profile?.phone_number || "",
      department: profile?.department || "",
      research_interests: supervisorData?.research_interests || "",
      publications: supervisorData?.publications ? JSON.stringify(supervisorData.publications, null, 2) : "[]",
      leisure_time: supervisorData?.leisure_time || ""
    });
    setIsEditing(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and research details</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Research Cells</Label>
            <div className="flex flex-wrap gap-2">
              {researchCells.map((cell) => (
                <Button
                  key={cell.id}
                  type="button"
                  variant={selectedCells.includes(cell.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => isEditing && toggleResearchCell(cell.id)}
                  disabled={!isEditing}
                  className={!isEditing && !selectedCells.includes(cell.id) ? "opacity-50" : ""}
                >
                  {cell.name}
                </Button>
              ))}
            </div>
            {researchCells.length === 0 && (
              <p className="text-sm text-muted-foreground">No research cells available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Research Interests</Label>
            <Textarea
              value={formData.research_interests}
              onChange={(e) => setFormData({ ...formData, research_interests: e.target.value })}
              placeholder="Enter your research interests..."
              rows={3}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Leisure Time (Weekly Availability)</Label>
            <Textarea
              value={formData.leisure_time}
              onChange={(e) => setFormData({ ...formData, leisure_time: e.target.value })}
              placeholder="e.g., Monday 2-4pm, Wednesday 10am-12pm, Friday 3-5pm"
              rows={3}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Students will see this when scheduling meetings with you
            </p>
          </div>

          <div className="space-y-2">
            <Label>Publications (JSON Array)</Label>
            <Textarea
              value={formData.publications}
              onChange={(e) => setFormData({ ...formData, publications: e.target.value })}
              placeholder='[{"title": "Paper Title", "year": 2024, "journal": "Journal Name"}]'
              rows={5}
              className={`font-mono text-sm ${!isEditing ? "bg-muted" : ""}`}
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
