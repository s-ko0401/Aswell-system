import { useAtom } from "jotai";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { sidebarCollapsedAtom } from "@/state/ui";

export function AppLayout() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <SidebarProvider open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
      <Sidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">管理画面</span>
        </header>
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
