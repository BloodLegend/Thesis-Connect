import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupervisorSidebar } from "@/components/supervisor/SupervisorSidebar";
import { SupervisorProfile } from "@/components/supervisor/SupervisorProfile";
import { IncomingApplications } from "@/components/supervisor/IncomingApplications";
import { SupervisorTeams } from "@/components/supervisor/SupervisorTeams";
import { SupervisorNotifications } from "@/components/supervisor/SupervisorNotifications";
import { SupervisorMeeting } from "@/components/supervisor/SupervisorMeeting";
import { ContentChecker } from "@/components/shared/ContentChecker";

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/signin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile || profile.role !== "supervisor") {
        toast.error("Unauthorized access");
        navigate("/signin");
        return;
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/signin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <SupervisorProfile />;
      case "applications":
        return <IncomingApplications />;
      case "teams":
        return <SupervisorTeams />;
      case "meeting":
        return <SupervisorMeeting />;
      case "content-checker":
        return <ContentChecker />;
      case "notifications":
        return <SupervisorNotifications />;
      default:
        return <SupervisorProfile />;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <SupervisorSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="flex-1 p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default SupervisorDashboard;
