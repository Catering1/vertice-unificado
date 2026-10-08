import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, TrendingUp, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Compras", path: "/admin/compras", icon: ShoppingCart },
  { label: "Vendas", path: "/admin/vendas", icon: TrendingUp },
  { label: "Configurações", path: "/admin/configuracoes", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(() => localStorage.getItem("admin-sidebar-visible") !== "false");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarVisible(value => { localStorage.setItem("admin-sidebar-visible", String(!value)); return !value; });

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="flex min-h-dvh w-full min-w-0">
      {mobileSidebarOpen && <button className="fixed inset-0 z-40 bg-black/50 md:hidden" aria-label="Fechar menu lateral" onClick={() => setMobileSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside
        className={cn("hidden w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground", mobileSidebarOpen && "fixed inset-y-0 left-0 z-50 flex md:static md:z-auto", sidebarVisible ? "md:flex" : "md:hidden")}
      >
        {/* Profile section */}
        <div className="px-5 pt-6 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/40">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-base font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-primary">{user?.email?.split("@")[0] ?? "Utilizador"}</p>
                  <p className="truncate text-xs text-sidebar-foreground/50">Administrador</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mx-5 border-t border-sidebar-border" />

        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-sidebar-ring pl-[calc(0.75rem-3px)]"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-[1.2rem] w-[1.2rem]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/30">
            <TrendingUp className="h-4 w-4" />
            <span className="font-semibold">Vendig Machine Store · Gestão</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(value => !value)} aria-label={mobileSidebarOpen ? "Esconder barra lateral" : "Mostrar barra lateral"}>{mobileSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={toggleSidebar} aria-label={sidebarVisible ? "Esconder barra lateral" : "Mostrar barra lateral"}>{sidebarVisible ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</Button>
          <h1 className="text-lg font-semibold">
            {navItems.find(n => n.path === pathname)?.label ?? ""}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Conta"><Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><div className="max-w-56 truncate px-2 py-1.5 text-xs text-muted-foreground">{user?.email}</div><DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-5 md:p-8">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur md:hidden" aria-label="Navegação principal">
        {navItems.map(({ label, path, icon: Icon }) => <Link key={path} to={path} aria-current={pathname === path ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium", pathname === path ? "text-primary" : "text-muted-foreground")}><Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span></Link>)}
      </nav>
    </div>
  );
}
