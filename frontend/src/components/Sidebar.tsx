import { useAtom } from "jotai";
import { Building2, ChevronDown, ChevronRight, LogOut, Settings, Users, GraduationCap, FileText, List, Sun, Moon, Laptop, Calendar } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { calendarMenuOpenAtom, settingsMenuOpenAtom, trainingMenuOpenAtom } from "@/state/ui";
import { tokenStorage } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useAtom(settingsMenuOpenAtom);
  const [trainingOpen, setTrainingOpen] = useAtom(trainingMenuOpenAtom);
  const [calendarOpen, setCalendarOpen] = useAtom(calendarMenuOpenAtom);
  const { setTheme } = useTheme();
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isUsersActive = location.pathname.startsWith("/settings/users");
  const displayName = user?.username ?? "admin";
  const displayEmail = user?.email ?? "s-ko@as-well.co.jp";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    tokenStorage.clear();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs">
            <GraduationCap className="h-4 w-4" />
            <span>社内研修</span>
          </SidebarGroupLabel>
          <SidebarGroupAction
            title="社内研修メニューを切り替え"
            onClick={() => setTrainingOpen((open) => !open)}
          >
            {trainingOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupAction>
          {trainingOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/training/templates"} tooltip="研修テンプレート">
                    <NavLink to="/training/templates">
                      <FileText className="h-4 w-4" />
                      <span>研修テンプレート</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/training/list"} tooltip="研修一覧">
                    <NavLink to="/training/list">
                      <List className="h-4 w-4" />
                      <span>研修一覧</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4" />
            <span>カレンダー</span>
          </SidebarGroupLabel>
          <SidebarGroupAction
            title="カレンダーメニューを切り替え"
            onClick={() => setCalendarOpen((open) => !open)}
          >
            {calendarOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupAction>
          {calendarOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/calendars"} tooltip="カレンダー">
                    <NavLink to="/calendars">
                      <Calendar className="h-4 w-4" />
                      <span>カレンダー</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
        <SidebarSeparator className="my-2" />
        {user?.role === 1 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-xs">
              <Settings className="h-4 w-4" />
              <span>設定</span>
            </SidebarGroupLabel>
            <SidebarGroupAction
              title="設定メニューを切り替え"
              onClick={() => setSettingsOpen((open) => !open)}
            >
              {settingsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </SidebarGroupAction>
            {settingsOpen && (
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isUsersActive} tooltip="ユーザー管理">
                      <NavLink to="/settings/users">
                        <Users className="h-4 w-4" />
                        <span>ユーザー管理</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>テーマ切り替え</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>ライト</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>ダーク</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>システム</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
  );
}
