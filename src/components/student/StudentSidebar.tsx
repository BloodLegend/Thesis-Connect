import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Microscope, Users, UserPlus, GraduationCap, FileText, TrendingUp, Bell, User, Calendar, UsersRound, Newspaper, Shield } from "lucide-react";

type ActiveSection = "research-cells" | "trending-papers" | "find-team" | "create-team" | "my-team" | "browse-supervisor" | "apply-thesis" | "track-progress" | "notifications" | "profile" | "meeting" | "content-checker";

interface StudentSidebarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
}

const menuItems = [
  { id: "profile" as ActiveSection, title: "Profile", icon: User },
  { id: "research-cells" as ActiveSection, title: "Research Cells", icon: Microscope },
  { id: "trending-papers" as ActiveSection, title: "Trending Papers", icon: Newspaper },
  { id: "content-checker" as ActiveSection, title: "AI & Plagiarism Checker", icon: Shield },
  { id: "find-team" as ActiveSection, title: "Find Team Member", icon: Users },
  { id: "create-team" as ActiveSection, title: "Create Team", icon: UserPlus },
  { id: "my-team" as ActiveSection, title: "My Team", icon: UsersRound },
  { id: "browse-supervisor" as ActiveSection, title: "Browse Supervisor", icon: GraduationCap },
  { id: "apply-thesis" as ActiveSection, title: "Apply for Thesis", icon: FileText },
  { id: "track-progress" as ActiveSection, title: "Track Progress", icon: TrendingUp },
  { id: "meeting" as ActiveSection, title: "Meeting", icon: Calendar },
  { id: "notifications" as ActiveSection, title: "Notifications", icon: Bell },
];

export function StudentSidebar({ activeSection, setActiveSection }: StudentSidebarProps) {
  return (
    <Sidebar className="border-r border-border" collapsible="none">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg text-foreground">Student Menu</h2>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(item.id)}
                    isActive={activeSection === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
