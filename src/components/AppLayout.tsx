import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-50 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 px-6 py-5">
          <TrendingUp className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-primary">GestãoPro</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/50">
          © 2026 GestãoPro
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
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
