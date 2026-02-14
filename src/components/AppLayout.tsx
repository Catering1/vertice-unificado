import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, TrendingUp, Settings, Menu, X, LogOut, Package } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Produtos", path: "/produtos", icon: Package },
  { label: "Compras", path: "/compras", icon: ShoppingCart },
  { label: "Vendas", path: "/vendas", icon: TrendingUp },
  { label: "Configurações", path: "/configuracoes", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
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
                onClick={() => setOpen(false)}
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
            <span className="font-semibold">Vending Machine</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6">
          <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="text-lg font-semibold">
            {navItems.find(n => n.path === pathname)?.label ?? ""}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
