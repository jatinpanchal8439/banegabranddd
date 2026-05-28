import {
  LayoutDashboard,
  Users,
  UserPlus,
  Handshake,
  CalendarCheck,
  BarChart3,
  Settings,
  Shield,
  CalendarDays,
  ClipboardList,
  TicketCheck,
  Clock,
  Megaphone,
  FileText,
  UserCog,
  Users2,
  ClipboardCheck,
  CalendarRange,
  UserCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useIsAdmin, useHasRole } from "@/hooks/useAdmin";
import { ShieldCheck, ListTodo, BarChart2, Megaphone as MegaphoneIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Activities", url: "/activities", icon: CalendarCheck },
  { title: "Helpdesk", url: "/helpdesk", icon: TicketCheck },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Quotations", url: "/quotations", icon: FileText },
  { title: "My Tasks", url: "/my-tasks", icon: ListTodo },
  { title: "Daily Reports", url: "/daily-reports", icon: ClipboardCheck },
  { title: "Weekly Reports", url: "/weekly-reports", icon: CalendarRange },
  { title: "DigiLocker", url: "/digilocker", icon: ShieldCheck },
  { title: "Holidays", url: "/holidays", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const adminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Shield },
  { title: "Task Assignment", url: "/admin/tasks", icon: ClipboardList },
  { title: "Team Roles", url: "/admin/roles", icon: UserCog },
  { title: "Team Attendance", url: "/admin/attendance", icon: Users2 },
  { title: "Team Task Report", url: "/team-tasks", icon: BarChart2 },
  { title: "Send Notifications", url: "/admin/notifications", icon: MegaphoneIcon },
  { title: "Employee Directory", url: "/admin/employees", icon: Users },
];

const settingsItems = [
  { title: "My Profile", url: "/profile", icon: UserCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const { data: isAdmin } = useIsAdmin();
  const isLeader = useHasRole("owner", "admin", "hr_manager", "tl");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src="/bnega-brand-logo.png" alt="Banega Brand" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground">Banega Brand</span>
              <span className="text-xs text-sidebar-foreground/60">Sales CRM</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isLeader) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
