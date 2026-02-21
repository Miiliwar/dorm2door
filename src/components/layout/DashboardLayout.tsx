import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils, Bell, LogOut, Menu, X, User } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import PageLayout from '@/components/PageLayout';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, roles, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const roleLabel = roles.includes('admin') ? 'Admin' : roles.includes('cafe_manager') ? 'Cafe Manager' : roles.includes('delivery_worker') ? 'Delivery Worker' : 'Student';

  return (
    <PageLayout backgroundImage="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2070">
      <header className="bg-black/10 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:scale-105">
                <Utensils className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold hidden sm:inline text-white">Dorm2Door</span>
            </Link>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold border border-primary/20 uppercase tracking-tighter">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-white/10 transition-all text-white/80 hover:text-white">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold animate-in zoom-in">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-semibold text-white/90">{profile?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 overflow-y-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </PageLayout>
  );
};

export default DashboardLayout;
