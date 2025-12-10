import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { ResearchCells } from "@/components/student/ResearchCells";
import { TrendingPapers } from "@/components/student/TrendingPapers";
import { FindTeamMember } from "@/components/student/FindTeamMember";
import { CreateTeam } from "@/components/student/CreateTeam";
import { MyTeam } from "@/components/student/MyTeam";
import { BrowseSupervisor } from "@/components/student/BrowseSupervisor";
import { ApplyThesis } from "@/components/student/ApplyThesis";
import { TrackProgress } from "@/components/student/TrackProgress";
import { Notifications } from "@/components/student/Notifications";
import { ProfileSection } from "@/components/student/ProfileSection";
import { StudentMeeting } from "@/components/student/StudentMeeting";
import { ContentChecker } from "@/components/shared/ContentChecker";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

type ActiveSection = "research-cells" | "trending-papers" | "find-team" | "create-team" | "my-team" | "browse-supervisor" | "apply-thesis" | "track-progress" | "notifications" | "profile" | "meeting" | "content-checker";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ActiveSection>("profile");
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.role !== "student") {
        toast.error("Access denied: Student account required");
        navigate("/signin");
        return;
      }

      setUserProfile(profile);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/signin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/signin");
  };

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection userProfile={userProfile} onProfileUpdate={() => checkAuth()} />;
      case "research-cells":
        return <ResearchCells />;
      case "trending-papers":
        return <TrendingPapers />;
      case "content-checker":
        return <ContentChecker />;
      case "find-team":
        return <FindTeamMember />;
      case "create-team":
        return <CreateTeam />;
      case "my-team":
        return <MyTeam />;
      case "browse-supervisor":
        return <BrowseSupervisor />;
      case "apply-thesis":
        return <ApplyThesis />;
      case "track-progress":
        return <TrackProgress />;
      case "meeting":
        return <StudentMeeting />;
      case "notifications":
        return <Notifications />;
      default:
        return <ProfileSection userProfile={userProfile} onProfileUpdate={() => checkAuth()} />;
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/signin");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile && profile.role !== "student") {
      toast.error("Access denied: Student account required");
      navigate("/signin");
      return;
    }

    setUserProfile(profile);
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <StudentSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Thesis Management System
              </h1>
              <p className="text-sm text-muted-foreground">Student Portal</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            {renderSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentDashboard;
