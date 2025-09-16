import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "./Sidebar";
import InternDashboard from "./InternDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import AdminDashboard from "./AdminDashboard";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  points: number;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch or create user profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (existingProfile) {
            setProfile(existingProfile);
          } else {
            // Create profile from auth metadata
            const { data: newProfile, error } = await supabase
              .from('profiles')
              .insert({
                user_id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || null,
                role: session.user.user_metadata?.role || 'intern',
                department: session.user.user_metadata?.department || null,
              })
              .select()
              .single();

            if (error) {
              toast({
                title: "Profile Error",
                description: "Failed to create user profile",
                variant: "destructive",
              });
            } else {
              setProfile(newProfile);
            }
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'intern':
        return <InternDashboard profile={profile} />;
      case 'employee':
        return <EmployeeDashboard profile={profile} />;
      case 'admin':
        return <AdminDashboard profile={profile} />;
      default:
        return <InternDashboard profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        profile={profile}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSignOut={handleSignOut}
      />
      <main 
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {renderDashboard()}
      </main>
    </div>
  );
}