import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Users, Shield } from "lucide-react";

type RoleType = "student" | "supervisor" | "admin";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("student");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Redirect based on role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        if (profile) {
          switch (profile.role) {
            case "admin":
              navigate("/admin");
              break;
            case "supervisor":
              navigate("/supervisor");
              break;
            default:
              navigate("/student");
          }
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Get user role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          // Validate that user role matches selected role
          if (profile.role !== selectedRole) {
            await supabase.auth.signOut();
            toast.error(`Access denied. You are not authorized as ${selectedRole}. Please select the correct role.`);
            return;
          }
          
          toast.success("Signed in successfully!");
          switch (profile.role) {
            case "admin":
              navigate("/admin");
              break;
            case "supervisor":
              navigate("/supervisor");
              break;
            default:
              navigate("/student");
          }
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            {selectedRole === "student" && <GraduationCap className="w-10 h-10 text-primary-foreground" />}
            {selectedRole === "supervisor" && <Users className="w-10 h-10 text-primary-foreground" />}
            {selectedRole === "admin" && <Shield className="w-10 h-10 text-primary-foreground" />}
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to access Thesis Management System
            </CardDescription>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              type="button"
              variant={selectedRole === "student" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRole("student")}
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </Button>
            <Button
              type="button"
              variant={selectedRole === "supervisor" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRole("supervisor")}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Supervisor
            </Button>
            <Button
              type="button"
              variant={selectedRole === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRole("admin")}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
