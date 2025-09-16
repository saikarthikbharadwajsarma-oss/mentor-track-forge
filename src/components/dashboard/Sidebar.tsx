import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  Home, 
  CheckSquare, 
  MessageSquare, 
  Upload, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Trophy,
  Building2
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  points: number;
}

interface SidebarProps {
  profile: Profile;
  collapsed: boolean;
  onToggle: () => void;
  onSignOut: () => void;
}

export default function Sidebar({ profile, collapsed, onToggle, onSignOut }: SidebarProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  const getInitials = (name: string | null) => {
    if (!name) return profile.email.charAt(0).toUpperCase();
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'employee': return 'bg-secondary text-secondary-foreground';
      case 'intern': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getNavItems = () => {
    const common = [
      { id: "dashboard", icon: Home, label: "Dashboard" },
      { id: "tasks", icon: CheckSquare, label: "Tasks" },
      { id: "chat", icon: MessageSquare, label: "Chat" },
      { id: "files", icon: Upload, label: "Files" },
    ];

    const roleSpecific = {
      intern: [],
      employee: [
        { id: "team", icon: Users, label: "Team" },
      ],
      admin: [
        { id: "team", icon: Users, label: "Team" },
        { id: "analytics", icon: BarChart3, label: "Analytics" },
        { id: "settings", icon: Settings, label: "Settings" },
      ]
    };

    return [...common, ...(roleSpecific[profile.role as keyof typeof roleSpecific] || [])];
  };

  return (
    <div className={`
      fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border 
      transition-all duration-300 z-50 animate-slide-in
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Track Forge</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-sidebar-accent">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile.full_name || profile.email}
                </p>
                <Badge className={`text-xs ${getRoleColor(profile.role)}`}>
                  {profile.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Trophy className="w-3 h-3" />
                <span>{profile.points} points</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {getNavItems().map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className={`
              w-full justify-start h-10 text-sidebar-foreground 
              hover:bg-sidebar-accent transition-colors
              ${collapsed ? 'px-3' : 'px-3'}
              ${activeTab === item.id ? 'bg-sidebar-accent' : ''}
            `}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="w-4 h-4" />
            {!collapsed && (
              <span className="ml-3 animate-fade-in">{item.label}</span>
            )}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`
            w-full justify-start h-10 text-sidebar-foreground 
            hover:bg-destructive hover:text-destructive-foreground
            ${collapsed ? 'px-3' : 'px-3'}
          `}
          onClick={onSignOut}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && (
            <span className="ml-3 animate-fade-in">Sign Out</span>
          )}
        </Button>
      </div>
    </div>
  );
}