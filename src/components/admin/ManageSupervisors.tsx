import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Mail, Building, Trash2, Edit2 } from "lucide-react";

export const ManageSupervisors = () => {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [researchCells, setResearchCells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    department: "",
    research_interests: "",
    research_cell_ids: [] as string[]
  });
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    research_interests: "",
    research_cell_ids: [] as string[]
  });

  useEffect(() => {
    fetchSupervisors();
    fetchResearchCells();
  }, []);

  const fetchSupervisors = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        supervisors (
          research_interests,
          supervisor_research_cells (
            research_cell_id,
            research_cells (name)
          )
        )
      `)
      .eq("role", "supervisor")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch supervisors");
      return;
    }

    setSupervisors(data || []);
    setLoading(false);
  };

  const fetchResearchCells = async () => {
    const { data } = await supabase.from("research_cells").select("*").order("name");
    setResearchCells(data || []);
  };

  const handleCreateSupervisor = async () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: "supervisor"
        }
      }
    });

    if (authError) {
      toast.error(authError.message);
      setCreating(false);
      return;
    }

    if (authData.user) {
      await supabase
        .from("profiles")
        .update({ department: formData.department })
        .eq("id", authData.user.id);

      await supabase.from("supervisors").insert({
        id: authData.user.id,
        research_interests: formData.research_interests
      });

      if (formData.research_cell_ids.length > 0) {
        const links = formData.research_cell_ids.map(cellId => ({
          supervisor_id: authData.user!.id,
          research_cell_id: cellId
        }));
        await supabase.from("supervisor_research_cells").insert(links);
      }

      toast.success("Supervisor created successfully");
      setDialogOpen(false);
      setFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        department: "",
        research_interests: "",
        research_cell_ids: []
      });
      fetchSupervisors();
    }

    setCreating(false);
  };

  const handleEditSupervisor = (supervisor: any) => {
    setSelectedSupervisor(supervisor);
    setEditFormData({
      first_name: supervisor.first_name || "",
      last_name: supervisor.last_name || "",
      department: supervisor.department || "",
      research_interests: supervisor.supervisors?.[0]?.research_interests || "",
      research_cell_ids: supervisor.supervisors?.[0]?.supervisor_research_cells?.map((src: any) => src.research_cell_id) || []
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSupervisor = async () => {
    if (!selectedSupervisor) return;

    setCreating(true);

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        department: editFormData.department
      })
      .eq("id", selectedSupervisor.id);

    if (profileError) {
      toast.error("Failed to update profile");
      setCreating(false);
      return;
    }

    // Update supervisor info
    const { error: supError } = await supabase
      .from("supervisors")
      .update({
        research_interests: editFormData.research_interests
      })
      .eq("id", selectedSupervisor.id);

    if (supError) {
      // If supervisor record doesn't exist, create it
      await supabase.from("supervisors").insert({
        id: selectedSupervisor.id,
        research_interests: editFormData.research_interests
      });
    }

    // Update research cells
    await supabase
      .from("supervisor_research_cells")
      .delete()
      .eq("supervisor_id", selectedSupervisor.id);

    if (editFormData.research_cell_ids.length > 0) {
      const links = editFormData.research_cell_ids.map(cellId => ({
        supervisor_id: selectedSupervisor.id,
        research_cell_id: cellId
      }));
      await supabase.from("supervisor_research_cells").insert(links);
    }

    toast.success("Supervisor updated successfully");
    setEditDialogOpen(false);
    setCreating(false);
    fetchSupervisors();
  };

  const handleDeleteSupervisor = async (supervisorId: string) => {
    if (!confirm("Are you sure you want to delete this supervisor? This action cannot be undone.")) {
      return;
    }

    // Delete supervisor record
    await supabase.from("supervisor_research_cells").delete().eq("supervisor_id", supervisorId);
    await supabase.from("supervisors").delete().eq("id", supervisorId);
    
    // Note: We can't delete from auth.users directly, but we can update the profile
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", supervisorId);

    if (error) {
      toast.error("Failed to delete supervisor completely");
      return;
    }

    toast.success("Supervisor deleted successfully");
    fetchSupervisors();
  };

  const toggleResearchCell = (cellId: string, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        research_cell_ids: prev.research_cell_ids.includes(cellId)
          ? prev.research_cell_ids.filter(id => id !== cellId)
          : [...prev.research_cell_ids, cellId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        research_cell_ids: prev.research_cell_ids.includes(cellId)
          ? prev.research_cell_ids.filter(id => id !== cellId)
          : [...prev.research_cell_ids, cellId]
      }));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Supervisors</h1>
          <p className="text-muted-foreground mt-1">Create and manage supervisor accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Supervisor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Supervisor Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Research Interests</Label>
                <Textarea
                  value={formData.research_interests}
                  onChange={(e) => setFormData({ ...formData, research_interests: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Research Cells</Label>
                <div className="flex flex-wrap gap-2">
                  {researchCells.map((cell) => (
                    <Button
                      key={cell.id}
                      type="button"
                      variant={formData.research_cell_ids.includes(cell.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleResearchCell(cell.id)}
                    >
                      {cell.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateSupervisor} disabled={creating} className="w-full">
                {creating ? "Creating..." : "Create Supervisor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Research Interests</Label>
              <Textarea
                value={editFormData.research_interests}
                onChange={(e) => setEditFormData({ ...editFormData, research_interests: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Research Cells</Label>
              <div className="flex flex-wrap gap-2">
                {researchCells.map((cell) => (
                  <Button
                    key={cell.id}
                    type="button"
                    variant={editFormData.research_cell_ids.includes(cell.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleResearchCell(cell.id, true)}
                  >
                    {cell.name}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleUpdateSupervisor} disabled={creating} className="w-full">
              {creating ? "Updating..." : "Update Supervisor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {supervisors.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No supervisors yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {supervisors.map((supervisor) => (
            <Card key={supervisor.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {supervisor.first_name} {supervisor.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {supervisor.email}
                      </p>
                      {supervisor.department && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {supervisor.department}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-sm text-muted-foreground">
                        {supervisor.supervisors?.[0]?.research_interests || "No research interests set"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditSupervisor(supervisor)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteSupervisor(supervisor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
