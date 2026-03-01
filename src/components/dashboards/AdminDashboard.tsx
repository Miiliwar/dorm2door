import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Store, Users, ShoppingBag, Truck, Plus, Trash2, Phone,
  User as UserIcon, LayoutDashboard, ChevronRight, Coffee,
  UserCog, ClipboardList, Menu, X, Edit2, Info, Search, Calendar,
  MapPin, User, Package, Eye, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

type SidebarItem = 'dashboard' | 'cafes' | 'managers' | 'workers' | 'orders';

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = (searchParams.get('tab') as SidebarItem) || 'dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cafes, setCafes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cafe form
  const [newCafe, setNewCafe] = useState({ name: '', description: '', location: '', manager_email: '', manager_password: '', manager_name: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Worker form
  const [newWorker, setNewWorker] = useState({ name: '', email: '', password: '', phone: '' });
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [creatingWorker, setCreatingWorker] = useState(false);

  // Detail/Edit States
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [isEditingCafe, setIsEditingCafe] = useState(false);
  const [cafeDetailsOpen, setCafeDetailsOpen] = useState(false);

  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [workerDetailsOpen, setWorkerDetailsOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [managerDetailsOpen, setManagerDetailsOpen] = useState(false);

  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  const fetchData = async () => {
    const [cafesRes, ordersRes, workersRes, profilesRes] = await Promise.all([
      supabase.from('cafes').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, cafes(name), order_items(*, menu_items(name))').order('created_at', { ascending: false }).limit(100),
      supabase.from('delivery_workers').select('*'),
      supabase.from('profiles').select('*'),
    ]);
    if (cafesRes.data) setCafes(cafesRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (workersRes.data) setWorkers(workersRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getProfileName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.full_name || 'Unknown';
  };

  const getProfilePhone = (userId: string | null) => {
    if (!userId) return '';
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.phone || '';
  };

  const getProfileEmail = (userId: string | null) => {
    if (!userId) return '';
    const p = profiles.find(pr => pr.user_id === userId);
    // profiles might not have email, but we can show user_id as fallback
    return p?.email || '';
  };

  const createCafeWithManager = async () => {
    if (!newCafe.name || !newCafe.manager_email || !newCafe.manager_password || !newCafe.manager_name) {
      toast.error('Please fill cafe name, manager name, email and password');
      return;
    }
    setCreating(true);
    try {
      console.log('Invoking create-cafe-manager function...');
      const { data, error: funcError } = await supabase.functions.invoke('create-cafe-manager', {
        body: {
          cafe_name: newCafe.name,
          cafe_description: newCafe.description,
          cafe_location: newCafe.location,
          manager_email: newCafe.manager_email,
          manager_password: newCafe.manager_password,
          manager_name: newCafe.manager_name,
        },
      });

      if (funcError) {
        console.error('Edge Function Error:', funcError);
        throw funcError;
      }

      if (data?.error) {
        toast.error(data.error);
        setCreating(false);
        return;
      }

      toast.success(`Cafe "${newCafe.name}" created with manager ${newCafe.manager_email}`);
      setDialogOpen(false);
      setNewCafe({ name: '', description: '', location: '', manager_email: '', manager_password: '', manager_name: '' });
      fetchData();
    } catch (err: any) {
      console.error('Failed to create cafe:', err);
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('Failed to send a request');
      toast.error(isNetworkError
        ? 'Network Error: The Edge Function might not be deployed. Run "npx supabase functions deploy create-cafe-manager" in your terminal.'
        : (err.message || 'Failed to create cafe')
      );
    }
    setCreating(false);
  };

  const createDeliveryWorker = async () => {
    if (!newWorker.name || !newWorker.email || !newWorker.password) {
      toast.error('Please fill worker name, email and password');
      return;
    }
    setCreatingWorker(true);
    try {
      console.log('Invoking create-delivery-worker function...');
      const { data, error: funcError } = await supabase.functions.invoke('create-delivery-worker', {
        body: {
          worker_name: newWorker.name,
          worker_email: newWorker.email,
          worker_password: newWorker.password,
          worker_phone: newWorker.phone,
        },
      });

      if (funcError) {
        console.error('Edge Function Error:', funcError);
        throw funcError;
      }

      if (data?.error) {
        toast.error(data.error);
        setCreatingWorker(false);
        return;
      }

      toast.success(`Delivery worker "${newWorker.name}" created with email ${newWorker.email}`);
      setWorkerDialogOpen(false);
      setNewWorker({ name: '', email: '', password: '', phone: '' });
      fetchData();
    } catch (err: any) {
      console.error('Failed to create delivery worker:', err);
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('Failed to send a request');
      toast.error(isNetworkError
        ? 'Network Error: The Edge Function might not be deployed. Run "npx supabase functions deploy create-delivery-worker" in your terminal.'
        : (err.message || 'Failed to create delivery worker')
      );
    }
    setCreatingWorker(false);
  };

  const deleteCafe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cafe? All menu items and data will be lost.')) return;
    const { error } = await supabase.from('cafes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cafe deleted');
    fetchData();
  };

  const updateCafe = async () => {
    if (!selectedCafe) return;
    const { error } = await supabase.from('cafes').update({
      name: selectedCafe.name,
      location: selectedCafe.location,
      description: selectedCafe.description,
      is_active: selectedCafe.is_active,
    }).eq('id', selectedCafe.id);

    if (error) { toast.error(error.message); return; }
    toast.success('Cafe updated');
    setCafeDetailsOpen(false);
    setIsEditingCafe(false);
    fetchData();
  };

  const updateWorkerStatus = async (workerId: string, isFree: boolean) => {
    const { error } = await supabase.from('delivery_workers').update({
      is_free: isFree,
    }).eq('id', workerId);

    if (error) { toast.error(error.message); return; }
    toast.success('Worker status updated');
    fetchData();
  };

  const updateManager = async () => {
    if (!selectedManager) return;
    const { error } = await supabase.from('profiles').update({
      full_name: selectedManager.managerName,
      phone: selectedManager.managerPhone,
    }).eq('user_id', selectedManager.managerId);

    if (error) { toast.error(error.message); return; }
    toast.success('Manager information updated');
    setManagerDetailsOpen(false);
    fetchData();
  };

  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

  if (loading) return <div className="text-center py-12 text-white/60">Loading dashboard...</div>;

  const sidebarItems: { id: SidebarItem; icon: any; label: string; badge?: number }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'cafes', icon: Coffee, label: 'Manage Cafes', badge: cafes.length },
    { id: 'managers', icon: UserCog, label: 'Manage Managers', badge: cafes.filter(c => c.manager_id).length },
    { id: 'workers', icon: Truck, label: 'Delivery Workers', badge: workers.length },
    { id: 'orders', icon: ClipboardList, label: 'Orders', badge: orders.length },
  ];

  const handleNav = (id: SidebarItem) => {
    setSearchParams({ tab: id });
    setSidebarOpen(false);
  };

  // ─── RENDER SECTIONS ──────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Dashboard Overview</h1>
        <p className="text-white/50 text-sm">Your campus food network at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Store, label: 'Total Cafes', value: cafes.length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: ShoppingBag, label: 'Total Orders', value: orders.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: Truck, label: 'Delivery Workers', value: workers.length, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { icon: Users, label: 'Revenue', value: `${totalRevenue.toFixed(0)} ETB`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((s, i) => (
          <div key={i} className="card-glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-display font-bold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <button onClick={() => setSearchParams({ tab: 'cafes' })} className="card-glass rounded-xl p-5 text-left hover:bg-white/15 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Coffee className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-white">Manage Cafes</p>
                <p className="text-xs text-white/40">{cafes.length} cafes registered</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </button>
        <button onClick={() => setSearchParams({ tab: 'workers' })} className="card-glass rounded-xl p-5 text-left hover:bg-white/15 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <p className="font-medium text-white">Delivery Workers</p>
                <p className="text-xs text-white/40">{workers.filter(w => w.is_free).length} available</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </button>
        <button onClick={() => setSearchParams({ tab: 'orders' })} className="card-glass rounded-xl p-5 text-left hover:bg-white/15 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Recent Orders</p>
                <p className="text-xs text-white/40">{orders.filter(o => o.status === 'pending_availability').length} pending</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </button>
      </div>

      {/* Latest 5 orders preview */}
      <div className="card-glass rounded-xl">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-white">Latest Orders</h2>
          <button onClick={() => setSearchParams({ tab: 'orders' })} className="text-xs text-primary hover:underline">View all →</button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="font-mono text-sm font-medium text-white">{order.order_code}</p>
                <p className="text-xs text-white/50">{(order as any).cafes?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{order.total_amount} ETB</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{order.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-center text-white/40 py-6">No orders yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderCafes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Manage Cafes</h1>
          <p className="text-white/50 text-sm">Add, view, and manage campus cafes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Cafe</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#1A1F2C] border-white/10 text-white">
            <DialogHeader><DialogTitle className="font-display">Add New Cafe with Manager</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Cafe Details</p>
                <div><Label>Cafe Name *</Label><Input value={newCafe.name} onChange={e => setNewCafe({ ...newCafe, name: e.target.value })} placeholder="e.g. Science Block Cafe" /></div>
                <div><Label>Location</Label><Input value={newCafe.location} onChange={e => setNewCafe({ ...newCafe, location: e.target.value })} placeholder="Building, Floor" /></div>
                <div><Label>Description</Label><Input value={newCafe.description} onChange={e => setNewCafe({ ...newCafe, description: e.target.value })} placeholder="Short description" /></div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Manager Account</p>
                <div><Label>Manager Full Name *</Label><Input value={newCafe.manager_name} onChange={e => setNewCafe({ ...newCafe, manager_name: e.target.value })} placeholder="Manager name" /></div>
                <div><Label>Manager Email *</Label><Input type="email" value={newCafe.manager_email} onChange={e => setNewCafe({ ...newCafe, manager_email: e.target.value })} placeholder="manager@cafe.com" /></div>
                <div><Label>Manager Password *</Label><Input type="password" value={newCafe.manager_password} onChange={e => setNewCafe({ ...newCafe, manager_password: e.target.value })} placeholder="Min 6 characters" /></div>
              </div>
              <Button onClick={createCafeWithManager} className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Cafe & Manager Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cafes.length === 0 ? (
        <div className="card-glass rounded-xl p-12 text-center">
          <Store className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No cafes yet. Add your first cafe!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cafes.map(cafe => (
            <div key={cafe.id} className="card-glass rounded-xl p-5 hover:bg-white/5 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Coffee className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white text-lg">{cafe.name}</h3>
                    <p className="text-sm text-white/50">{cafe.location || 'No location set'}</p>
                    <p className="text-xs text-white/40 mt-0.5">👤 Manager: {getProfileName(cafe.manager_id)}</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${cafe.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {cafe.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedCafe(cafe); setIsEditingCafe(false); setCafeDetailsOpen(true); }} className="text-white/60 hover:text-white hover:bg-white/10">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedCafe(cafe); setIsEditingCafe(true); setCafeDetailsOpen(true); }} className="text-white/60 hover:text-white hover:bg-white/10">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCafe(cafe.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cafe Detail/Edit Modal */}
      <Dialog open={cafeDetailsOpen} onOpenChange={(open) => { setCafeDetailsOpen(open); if (!open) setIsEditingCafe(false); }}>
        <DialogContent className="sm:max-w-lg bg-[#1A1F2C] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditingCafe ? "Edit Cafe" : "Cafe Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedCafe && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cafe Name</Label>
                  <Input
                    value={selectedCafe.name}
                    onChange={e => setSelectedCafe({ ...selectedCafe, name: e.target.value })}
                    readOnly={!isEditingCafe}
                    className={!isEditingCafe ? "bg-transparent border-white/10" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={selectedCafe.location || ''}
                    onChange={e => setSelectedCafe({ ...selectedCafe, location: e.target.value })}
                    readOnly={!isEditingCafe}
                    className={!isEditingCafe ? "bg-transparent border-white/10" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    value={selectedCafe.description || ''}
                    onChange={e => setSelectedCafe({ ...selectedCafe, description: e.target.value })}
                    readOnly={!isEditingCafe}
                    className={`w-full bg-transparent border rounded-md p-2 text-sm min-h-[100px] border-white/10 ${isEditingCafe ? "focus:ring-2 focus:ring-primary" : ""}`}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">Active Status</p>
                    <p className="text-xs text-white/50">Show or hide this cafe from students</p>
                  </div>
                  <Button
                    variant={selectedCafe.is_active ? "default" : "secondary"}
                    size="sm"
                    disabled={!isEditingCafe}
                    onClick={() => setSelectedCafe({ ...selectedCafe, is_active: !selectedCafe.is_active })}
                  >
                    {selectedCafe.is_active ? "Active" : "Inactive"}
                  </Button>
                </div>
              </div>

              {isEditingCafe ? (
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setIsEditingCafe(false)}>Cancel</Button>
                  <Button onClick={updateCafe}>Save Changes</Button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-widest font-bold">Admin Info</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/50">Created At</p>
                      <p className="text-sm text-white">{new Date(selectedCafe.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">ID</p>
                      <p className="text-[10px] text-white/60 font-mono break-all">{selectedCafe.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderManagers = () => {
    const managersWithCafes = cafes.filter(c => c.manager_id).map(c => ({
      cafeId: c.id,
      cafeName: c.name,
      cafeLocation: c.location,
      managerId: c.manager_id,
      managerName: getProfileName(c.manager_id),
      managerPhone: getProfilePhone(c.manager_id),
      isActive: c.is_active,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Manage Managers</h1>
          <p className="text-white/50 text-sm">View cafe managers and their assignments</p>
        </div>

        {managersWithCafes.length === 0 ? (
          <div className="card-glass rounded-xl p-12 text-center">
            <UserCog className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No managers assigned yet. Add a cafe to create a manager.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {managersWithCafes.map(m => (
              <div key={m.cafeId} className="card-glass rounded-xl p-5 group hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-violet-500/15 flex items-center justify-center">
                    <UserCog className="h-6 w-6 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-white">{m.managerName}</h3>
                    {m.managerPhone && (
                      <p className="text-sm text-white/50 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {m.managerPhone}
                      </p>
                    )}
                    <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                      <Coffee className="h-3 w-3" /> Assigned to: <span className="font-medium text-amber-400">{m.cafeName}</span>
                      {m.cafeLocation && <span className="text-white/30"> ({m.cafeLocation})</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${m.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white"
                      onClick={() => { setSelectedManager(m); setManagerDetailsOpen(true); }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manager Edit Modal */}
        <Dialog open={managerDetailsOpen} onOpenChange={setManagerDetailsOpen}>
          <DialogContent className="sm:max-w-md bg-[#1A1F2C] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="font-display text-white">Edit Manager Info</DialogTitle>
            </DialogHeader>
            {selectedManager && (
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Full Name</Label>
                    <Input
                      value={selectedManager.managerName}
                      onChange={e => setSelectedManager({ ...selectedManager, managerName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Phone Number</Label>
                    <Input
                      value={selectedManager.managerPhone || ''}
                      onChange={e => setSelectedManager({ ...selectedManager, managerPhone: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="e.g. 0911234567"
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold mb-2">Manager for</p>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-sm font-medium text-white">{selectedManager.cafeName}</p>
                      <p className="text-xs text-white/50">{selectedManager.cafeLocation || 'No location set'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => setManagerDetailsOpen(false)}>Cancel</Button>
                  <Button onClick={updateManager}>Update Manager</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderWorkers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Delivery Workers</h1>
          <p className="text-white/50 text-sm">Add and manage delivery workers</p>
        </div>
        <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Worker</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#1A1F2C] border-white/10 text-white">
            <DialogHeader><DialogTitle className="font-display">Add New Delivery Worker</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div><Label>Full Name *</Label><Input value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} placeholder="e.g. Abebe Kebede" /></div>
                <div><Label>Phone Number</Label><Input value={newWorker.phone} onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })} placeholder="e.g. 0911234567" /></div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Login Credentials</p>
                <div><Label>Email *</Label><Input type="email" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} placeholder="worker@email.com" /></div>
                <div><Label>Password *</Label><Input type="password" value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} placeholder="Min 6 characters" /></div>
              </div>
              <Button onClick={createDeliveryWorker} className="w-full" disabled={creatingWorker}>
                {creatingWorker ? 'Creating...' : 'Create Delivery Worker Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workers.length === 0 ? (
        <div className="card-glass rounded-xl p-12 text-center">
          <Truck className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No delivery workers yet. Add your first worker!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workers.map(worker => (
            <div key={worker.id} className="card-glass rounded-xl p-5 hover:bg-white/5 transition-colors group" onClick={() => { setSelectedWorker(worker); setWorkerDetailsOpen(true); }}>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-sky-500/15 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white">{getProfileName(worker.user_id)}</h3>
                    <div className="flex items-center gap-4 mt-0.5">
                      {getProfilePhone(worker.user_id) && (
                        <p className="text-sm text-white/50 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {getProfilePhone(worker.user_id)}
                        </p>
                      )}
                      <p className="text-xs text-white/40">{worker.total_deliveries} deliveries · ⭐ {worker.rating || 'New'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${worker.is_free ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {worker.is_free ? 'Available' : 'On Delivery'}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info className="h-4 w-4 text-white/40" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Worker Detail Modal */}
      <Dialog open={workerDetailsOpen} onOpenChange={setWorkerDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-[#1A1F2C] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">Delivery Worker Info</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6 py-4 text-white">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-20 w-20 rounded-full bg-sky-500/10 flex items-center justify-center border-4 border-sky-500/5 shadow-2xl">
                  <UserIcon className="h-10 w-10 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold">{getProfileName(selectedWorker.user_id)}</h3>
                  <p className="text-sm text-white/50">{getProfileEmail(selectedWorker.user_id)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-white">{selectedWorker.total_deliveries}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Total Deliveries</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-amber-400">⭐ {selectedWorker.rating || 'N/A'}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Average Rating</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-sky-400" />
                    <span className="text-sm">Phone Number</span>
                  </div>
                  <span className="text-sm font-medium">{getProfilePhone(selectedWorker.user_id) || 'Not set'}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <ClipboardList className="h-4 w-4 text-emerald-400" />
                    <span>Availability status</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-xs rounded-full border ${selectedWorker.is_free ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/30 text-amber-400 bg-amber-500/5'}`}
                    onClick={() => updateWorkerStatus(selectedWorker.id, !selectedWorker.is_free)}
                  >
                    {selectedWorker.is_free ? 'Available' : 'Busy / On Delivery'}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/30 text-center">Joined on {new Date(selectedWorker.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">All Orders</h1>
        <p className="text-white/50 text-sm">{orders.length} total orders across all cafes</p>
      </div>

      <div className="grid gap-4">
        <div className="card-glass rounded-xl p-3 flex items-center gap-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by order code, cafe or status..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/30"
            value={orderSearchTerm}
            onChange={(e) => setOrderSearchTerm(e.target.value)}
          />
        </div>

        {orders.length === 0 ? (
          <div className="card-glass rounded-xl p-12 text-center">
            <ClipboardList className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No orders yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              .filter(o =>
                o.order_code.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                (o as any).cafes?.name.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                o.status.replace(/_/g, ' ').toLowerCase().includes(orderSearchTerm.toLowerCase())
              )
              .map(order => (
                <div
                  key={order.id}
                  className="card-glass rounded-xl p-4 hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => { setSelectedOrder(order); setOrderDetailsOpen(true); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-white/60 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-white tracking-widest">{order.order_code}</p>
                        <p className="text-xs text-white/50">{(order as any).cafes?.name} · {new Date(order.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-white/30 uppercase tracking-tighter font-bold">Amount</p>
                        <p className="text-sm font-bold text-white">{order.total_amount} ETB</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider ${order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                          ['preparing', 'ready', 'out_for_delivery'].includes(order.status) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-white/10 text-white/60 border border-white/10'
                          }`}>{order.status.replace(/_/g, ' ')}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1F2C] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              Order {selectedOrder?.order_code}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-8 py-4 text-white">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase font-bold">Current Status</p>
                    <p className="text-lg font-bold text-white capitalize">{selectedOrder.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase font-bold">Placed On</p>
                  <p className="text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Items & Summary */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardList className="h-3 w-3" /> Order Items
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
                        <div className="flex gap-3">
                          <span className="text-primary font-bold">x{item.quantity}</span>
                          <span className="text-white/80">{item.menu_items?.name || 'Unknown Item'}</span>
                        </div>
                        <span className="font-medium">{item.price_at_time * item.quantity} ETB</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Delivery Fee</span>
                      <span>{selectedOrder.delivery_fee} ETB</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">{selectedOrder.total_amount} ETB</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/50 pt-1 capitalize">
                      <span>Payment Method</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> {selectedOrder.payment_method} ({selectedOrder.payment_status})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logistics */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                      <User className="h-3 w-3" /> Student Info
                    </h4>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <p className="text-sm font-bold text-white">{selectedOrder.delivery_full_name}</p>
                      <p className="text-xs text-white/50 flex items-center gap-2">
                        <Phone className="h-3 w-3" /> {selectedOrder.delivery_phone}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.delivery_type === 'delivery' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> Delivery Address
                      </h4>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <p className="text-sm text-white/90">
                          {selectedOrder.delivery_building}, Dorm {selectedOrder.delivery_dorm_number}
                        </p>
                        {selectedOrder.delivery_floor && (
                          <p className="text-xs text-white/50">Floor {selectedOrder.delivery_floor}</p>
                        )}
                        {selectedOrder.delivery_comments && (
                          <p className="text-xs text-amber-400 bg-amber-400/5 p-2 rounded italic mt-2 border border-amber-400/10">
                            "{selectedOrder.delivery_comments}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                      <Store className="h-3 w-3" /> Fulfilling Cafe
                    </h4>
                    <p className="text-sm font-medium text-white/80">{selectedOrder.cafes?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const contentMap: Record<SidebarItem, () => JSX.Element> = {
    dashboard: renderDashboard,
    cafes: renderCafes,
    managers: renderManagers,
    workers: renderWorkers,
    orders: renderOrders,
  };

  return (
    <div className="flex gap-0 md:gap-6 min-h-[calc(100vh-80px)] -mx-4 md:-mx-6 -my-4 md:-my-6">
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 right-6 z-50 md:hidden h-12 w-12 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 md:top-24 left-0 z-40 md:z-auto
        h-full md:h-fit
        w-64 md:w-56 lg:w-64
        card-glass rounded-none md:rounded-2xl
        p-4 pt-6 md:p-5
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="md:sticky md:top-24">
          <div className="mb-6 px-2">
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest">Admin Panel</h2>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${activeSection === item.id
                  ? 'bg-primary/20 text-primary font-semibold border border-primary/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${activeSection === item.id ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'
                    }`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 min-w-0">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" key={activeSection}>
          {contentMap[activeSection]()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
