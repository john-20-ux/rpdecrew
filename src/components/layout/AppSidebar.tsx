import {
  LayoutDashboard, Users, Layers, UserCircle, Lightbulb, Settings
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Team Performance", url: "/team", icon: Users },
  { title: "Stage Analytics", url: "/stages", icon: Layers },
  { title: "Individual Reports", url: "/individuals", icon: UserCircle },
  { title: "Insights", url: "/insights", icon: Lightbulb },
  { title: "Settings", url: "/settings", icon: Settings, requireAdmin: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { currentUser, logout } = useAuth();
  
  const filteredNavItems = navItems.filter(item => !item.requireAdmin || currentUser?.role === "admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`flex items-center gap-2 py-5 ${collapsed ? "justify-center px-0" : "px-4"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            W
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              Team Workforce
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-border">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{currentUser?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="w-full" onClick={logout} title="Logout">
            <UserCircle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </Sidebar>
  );
}
