import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, ClipboardList, User, Bell, LayoutDashboard, Utensils, Truck, Settings, UserCog } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MobileNav = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { unreadCount } = useNotifications();
    const { roles } = useAuth();

    const currentTab = searchParams.get('tab');

    const getTabs = () => {
        if (roles.includes('admin')) {
            return [
                { icon: LayoutDashboard, label: 'Stats', path: '/dashboard?tab=dashboard' },
                { icon: Utensils, label: 'Cafes', path: '/dashboard?tab=cafes' },
                { icon: UserCog, label: 'Staff', path: '/dashboard?tab=managers' },
                { icon: Truck, label: 'Fleet', path: '/dashboard?tab=workers' },
                { icon: ClipboardList, label: 'Orders', path: '/dashboard?tab=orders' },
            ];
        }
        if (roles.includes('cafe_manager')) {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard?tab=home' },
                { icon: Utensils, label: 'Menu', path: '/dashboard?tab=menu' },
                { icon: ClipboardList, label: 'Orders', path: '/dashboard?tab=orders' },
                { icon: Bell, label: 'Alerts', path: '/dashboard?tab=alerts', badge: unreadCount },
            ];
        }
        if (roles.includes('delivery_worker')) {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard?tab=home' },
                { icon: Truck, label: 'Deliver', path: '/dashboard?tab=deliver' },
                { icon: ClipboardList, label: 'History', path: '/dashboard?tab=history' },
                { icon: Bell, label: 'Alerts', path: '/dashboard?tab=alerts', badge: unreadCount },
            ];
        }
        // General Student Tabs
        return [
            { icon: Home, label: 'Explore', path: '/dashboard?tab=explore' },
            { icon: Utensils, label: 'Cafes', path: '/dashboard?tab=cafes' },
            { icon: ClipboardList, label: 'Orders', path: '/dashboard?tab=orders' },
            { icon: Bell, label: 'Alerts', path: '/dashboard?tab=alerts', badge: unreadCount },
        ];
    };

    const tabs = getTabs();

    const isActive = (tabPath: string, index: number) => {
        const tabParam = new URLSearchParams(tabPath.split('?')[1]).get('tab');
        if (!currentTab && index === 0) return true;
        return currentTab === tabParam;
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

