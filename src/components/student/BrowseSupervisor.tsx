import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Mail, Building2, FileText } from "lucide-react";
import { toast } from "sonner";

export function BrowseSupervisor() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [researchCells, setResearchCells] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResearchCells();
    fetchSupervisors();
  }, [selectedCell]);

  const fetchResearchCells = async () => {
    const { data } = await supabase
      .from("research_cells")
      .select("*")
      .order("name");
    setResearchCells(data || []);
  };

  const fetchSupervisors = async () => {
    setLoading(true);
    try {
      // Fetch supervisors with their profiles and research cells
      const { data: supervisorData, error: supervisorError } = await supabase
        .from("supervisors")
        .select(`
          *,
          research_cells:supervisor_research_cells(
            research_cell:research_cells(id, name)
          )
        `);

      if (supervisorError) throw supervisorError;

      // Fetch profiles for each supervisor
      const supervisorIds = (supervisorData || []).map(s => s.id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, department")
        .in("id", supervisorIds);

      if (profilesError) throw profilesError;

      // Merge profiles with supervisors
      const mergedData = (supervisorData || []).map(sup => ({
        ...sup,
        profile: profilesData?.find(p => p.id === sup.id) || null
      }));

      // Filter by research cell if selected
      let filteredData = mergedData;
      if (selectedCell && selectedCell !== "all") {
        filteredData = filteredData.filter((sup: any) =>
          sup.research_cells?.some((rc: any) => rc.research_cell?.id === selectedCell)
        );
      }

      setSupervisors(filteredData);
    } catch (error: any) {
      console.error("Error fetching supervisors:", error);
      toast.error("Failed to load supervisors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Browse Supervisors</h2>
        <p className="text-muted-foreground mt-1">Find supervisors for your thesis project</p>
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

      {loading ? (
        <div>Loading supervisors...</div>
      ) : supervisors.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No supervisors found. Try selecting a different research cell.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supervisors.map((supervisor) => (
            <Card key={supervisor.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  {supervisor.profile?.first_name} {supervisor.profile?.last_name}
                </CardTitle>
                <CardDescription className="space-y-2">
                  {supervisor.profile?.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>{supervisor.profile.department}</span>
                    </div>
                  )}
                  {supervisor.profile?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4" />
                      <span>{supervisor.profile.email}</span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {supervisor.research_cells && supervisor.research_cells.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {supervisor.research_cells.map((rc: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {rc.research_cell?.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedSupervisor(supervisor)}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSupervisor} onOpenChange={() => setSelectedSupervisor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSupervisor?.profile?.first_name} {selectedSupervisor?.profile?.last_name}
            </DialogTitle>
            <DialogDescription>
              {selectedSupervisor?.profile?.department}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {selectedSupervisor?.research_interests && (
              <div>
                <h3 className="font-semibold mb-2">Research Interests</h3>
                <p className="text-muted-foreground">{selectedSupervisor.research_interests}</p>
              </div>
            )}

            {selectedSupervisor?.research_cells && selectedSupervisor.research_cells.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Research Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSupervisor.research_cells.map((rc: any, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {rc.research_cell?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedSupervisor?.publications && selectedSupervisor.publications.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Publications & Previous Work
                </h3>
                <ul className="space-y-2">
                  {selectedSupervisor.publications.map((pub: any, idx: number) => (
                    <li key={idx} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{pub.title || `Publication ${idx + 1}`}</p>
                      {pub.description && (
                        <p className="text-sm text-muted-foreground mt-1">{pub.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedSupervisor?.profile?.email && (
              <div>
                <h3 className="font-semibold mb-2">Contact</h3>
                <p className="text-muted-foreground">{selectedSupervisor.profile.email}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
