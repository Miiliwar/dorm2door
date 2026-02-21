import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import CafeManagerDashboard from '@/components/dashboards/CafeManagerDashboard';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import DeliveryDashboard from '@/components/dashboards/DeliveryDashboard';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Dashboard = () => {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const renderDashboard = () => {
    if (roles.includes('admin')) return <AdminDashboard />;
    if (roles.includes('cafe_manager')) return <CafeManagerDashboard />;
    if (roles.includes('delivery_worker')) return <DeliveryDashboard />;
    return <StudentDashboard />;
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
};

export default Dashboard;
