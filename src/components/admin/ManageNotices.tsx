import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Pencil, Trash2, Users, UserCog } from "lucide-react";

export const ManageNotices = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", content: "", target_audience: "all" });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from("global_notices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch notices");
      return;
    }

    setNotices(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (editingNotice) {
      const { error } = await supabase
        .from("global_notices")
        .update({ 
          title: formData.title, 
          content: formData.content,
          target_audience: formData.target_audience
        })
        .eq("id", editingNotice.id);

      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to update notice");
        return;
      }
      toast.success("Notice updated");
    } else {
      const { error } = await supabase
        .from("global_notices")
        .insert({ 
          title: formData.title, 
          content: formData.content,
          target_audience: formData.target_audience,
          created_by: user?.id
        });

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to create notice");
        return;
      }
      toast.success("Notice published");
    }

    setDialogOpen(false);
    setEditingNotice(null);
    setFormData({ title: "", content: "", target_audience: "all" });
    fetchNotices();
  };

  const handleEdit = (notice: any) => {
    setEditingNotice(notice);
    setFormData({ 
      title: notice.title, 
      content: notice.content,
      target_audience: notice.target_audience || "all"
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    const { error } = await supabase.from("global_notices").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete notice");
      return;
    }

    toast.success("Notice deleted");
    fetchNotices();
  };

  const openCreateDialog = () => {
    setEditingNotice(null);
    setFormData({ title: "", content: "", target_audience: "all" });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Global Notices</h1>
          <p className="text-muted-foreground mt-1">Post announcements visible to all students</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Post Notice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNotice ? "Edit" : "Create"} Notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notice title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Notice content..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Audience *</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        All (Students & Supervisors)
                      </div>
                    </SelectItem>
                    <SelectItem value="supervisors_only">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        Supervisors Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingNotice ? "Update" : "Publish"} Notice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notices posted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{notice.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notice.target_audience === "supervisors_only" 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-green-100 text-green-800"
                        }`}>
                          {notice.target_audience === "supervisors_only" ? "Supervisors Only" : "All"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {notice.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted: {new Date(notice.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(notice)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(notice.id)}>
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
