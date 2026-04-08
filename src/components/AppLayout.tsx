import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Archive, Settings, BarChart3, LogOut, FlaskConical, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
  { path: '/add', label: 'إضافة منتج', icon: PlusCircle },
  { path: '/archive', label: 'الأرشيف', icon: Archive },
  { path: '/testing-lab', label: 'مختبر المنتجات', icon: FlaskConical },
  { path: '/synced-data', label: 'بيانات EcoSmart', icon: RefreshCw },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

const mobileMainTabs = navItems.slice(0, 4); // Dashboard, Add, Archive, TestingLab
const mobileMoreItems = navItems.slice(4); // SyncedData, Settings

export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { fetchProducts, fetchSettings } = useAppStore();
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 glass-card border-b border-border/50">
          <div className="container flex items-center justify-center h-14">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-base font-bold gradient-text">محلل الأداء</h1>
            </div>
          </div>
        </header>

        <main className="container py-4 animate-fade-in">{children}</main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 bg-background/95 backdrop-blur-md">
          <div className="flex items-center justify-around h-16 px-1">
            {mobileMainTabs.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-0 flex-1 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[10px] font-medium truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* More Button with Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-0 flex-1 ${
                    mobileMoreItems.some(i => i.path === pathname)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] font-medium">المزيد</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                <div className="space-y-1 pt-4">
                  {mobileMoreItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-accent transition-all w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    );
  }

  // Desktop layout
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
