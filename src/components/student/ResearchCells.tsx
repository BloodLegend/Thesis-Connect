import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Microscope } from "lucide-react";
import { toast } from "sonner";

interface ResearchCell {
  id: string;
  name: string;
  description: string;
}

export function ResearchCells() {
  const [researchCells, setResearchCells] = useState<ResearchCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResearchCells();
  }, []);

  const fetchResearchCells = async () => {
    try {
      const { data, error } = await supabase
        .from("research_cells")
        .select("*")
        .order("name");

      if (error) throw error;
      setResearchCells(data || []);
    } catch (error: any) {
      toast.error("Failed to load research cells");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading research cells...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Research Cells</h2>
        <p className="text-muted-foreground mt-1">Explore available research areas</p>
      </div>

      {researchCells.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No research cells available yet. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchCells.map((cell) => (
            <Card key={cell.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Microscope className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{cell.name}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {cell.description || "No description available"}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
