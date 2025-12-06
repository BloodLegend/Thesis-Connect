import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Microscope, Plus, Pencil, Trash2 } from "lucide-react";

export const ManageResearchCells = () => {
  const [cells, setCells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchCells();
  }, []);

  const fetchCells = async () => {
    const { data, error } = await supabase
      .from("research_cells")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to fetch research cells");
      return;
    }

    setCells(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (editingCell) {
      const { error } = await supabase
        .from("research_cells")
        .update({ name: formData.name, description: formData.description })
        .eq("id", editingCell.id);

      if (error) {
        toast.error("Failed to update research cell");
        return;
      }
      toast.success("Research cell updated");
    } else {
      const { error } = await supabase
        .from("research_cells")
        .insert({ name: formData.name, description: formData.description });

      if (error) {
        toast.error("Failed to create research cell");
        return;
      }
      toast.success("Research cell created");
    }

    setDialogOpen(false);
    setEditingCell(null);
    setFormData({ name: "", description: "" });
    fetchCells();
  };

  const handleEdit = (cell: any) => {
    setEditingCell(cell);
    setFormData({ name: cell.name, description: cell.description || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this research cell?")) return;

    const { error } = await supabase.from("research_cells").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete research cell");
      return;
    }

    toast.success("Research cell deleted");
    fetchCells();
  };

  const openCreateDialog = () => {
    setEditingCell(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Research Cells</h1>
          <p className="text-muted-foreground mt-1">Manage university research areas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Research Cell
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCell ? "Edit" : "Create"} Research Cell</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Artificial Intelligence"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the research area..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingCell ? "Update" : "Create"} Research Cell
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cells.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Microscope className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No research cells yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cells.map((cell) => (
            <Card key={cell.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                      <Microscope className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cell.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cell.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cell)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cell.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
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
