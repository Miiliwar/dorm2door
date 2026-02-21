import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils, Bell, LogOut, Menu, X, User } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, roles, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const roleLabel = roles.includes('admin') ? 'Admin' : roles.includes('cafe_manager') ? 'Cafe Manager' : roles.includes('delivery_worker') ? 'Delivery Worker' : 'Student';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Utensils className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold hidden sm:inline">Dorm2Door</span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{roleLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{profile?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
