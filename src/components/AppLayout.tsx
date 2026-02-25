import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Archive, Settings, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const navItems = [
  { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
  { path: '/add', label: 'إضافة منتج', icon: PlusCircle },
  { path: '/archive', label: 'الأرشيف', icon: Archive },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { fetchProducts, fetchSettings } = useAppStore();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchSettings();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('تم تسجيل الخروج');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold gradient-text">محلل الأداء</h1>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-accent transition-all mr-2"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="container py-6 animate-fade-in">{children}</main>
    </div>
  );
}
