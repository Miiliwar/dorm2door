import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, User, Bell, LayoutDashboard, Utensils, Truck, Settings } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MobileNav = () => {
    const location = useLocation();
    const { unreadCount } = useNotifications();
    const { roles } = useAuth();

    const getTabs = () => {
        if (roles.includes('admin')) {
            return [
                { icon: LayoutDashboard, label: 'Stats', path: '/dashboard' },
                { icon: Utensils, label: 'Cafes', path: '/dashboard' },
                { icon: User, label: 'Users', path: '/dashboard' },
                { icon: Settings, label: 'Admin', path: '/dashboard' },
            ];
        }
        if (roles.includes('cafe_manager')) {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
                { icon: Utensils, label: 'Menu', path: '/dashboard' },
                { icon: ClipboardList, label: 'Orders', path: '/dashboard' },
                { icon: Bell, label: 'Alerts', path: '/dashboard', badge: unreadCount },
            ];
        }
        if (roles.includes('delivery_worker')) {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
                { icon: Truck, label: 'Deliver', path: '/dashboard' },
                { icon: ClipboardList, label: 'History', path: '/dashboard' },
                { icon: Bell, label: 'Alerts', path: '/dashboard', badge: unreadCount },
            ];
        }
        // General Student Tabs
        return [
            { icon: Home, label: 'Explore', path: '/dashboard' },
            { icon: Utensils, label: 'Cafes', path: '/dashboard' },
            { icon: ClipboardList, label: 'My Orders', path: '/dashboard' },
            { icon: Bell, label: 'Alerts', path: '/dashboard', badge: unreadCount },
        ];
    };

    const tabs = getTabs();
    const isActive = (path: string, index: number) => {
        // For now, since most link to /dashboard, we'll mark the first one as active
        // unless we implement search params for tabs later.
        return index === 0;
    };

    return (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            <nav className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl px-2 py-3 shadow-2xl safe-area-bottom flex justify-around items-center relative overflow-hidden">
                {/* Subtle Ambient Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

                {tabs.map((tab, i) => (
                    <Link
                        key={i}
                        to={tab.path}
                        className={cn(
                            "relative flex flex-col items-center gap-1.5 py-1 px-3 transition-all duration-500 rounded-xl",
                            isActive(tab.path, i) ? "text-primary scale-110" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        {/* Active Indicator Background */}
                        {isActive(tab.path, i) && (
                            <div className="absolute inset-0 bg-primary/10 rounded-xl blur-[2px] animate-pulse" />
                        )}

                        <div className="relative">
                            <tab.icon className={cn(
                                "h-5 w-5 transition-transform duration-500",
                                isActive(tab.path, i) ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : ""
                            )} />

                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold border-2 border-black/20 shadow-lg animate-bounce">
                                    {tab.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold tracking-tight uppercase">{tab.label}</span>

                        {/* Active Underline Dot */}
                        {isActive(tab.path, i) && (
                            <div className="h-1 w-1 rounded-full bg-primary mt-0.5 shadow-[0_0_8px_#f59e0b]" />
                        )}
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default MobileNav;
