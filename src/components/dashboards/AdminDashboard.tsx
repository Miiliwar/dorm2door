import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Store, Users, ShoppingBag, Truck, Plus, Trash2, Phone, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [cafes, setCafes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newCafe, setNewCafe] = useState({ name: '', description: '', location: '', manager_email: '', manager_password: '', manager_name: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Delivery worker form state
  const [newWorker, setNewWorker] = useState({ name: '', email: '', password: '', phone: '' });
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [creatingWorker, setCreatingWorker] = useState(false);

  const fetchData = async () => {
    const [cafesRes, ordersRes, workersRes, profilesRes] = await Promise.all([
      supabase.from('cafes').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, cafes(name)').order('created_at', { ascending: false }).limit(50),
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

  const createCafeWithManager = async () => {
    if (!newCafe.name || !newCafe.manager_email || !newCafe.manager_password || !newCafe.manager_name) {
      toast.error('Please fill cafe name, manager name, email and password');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-cafe-manager', {
        body: {
          cafe_name: newCafe.name,
          cafe_description: newCafe.description,
          cafe_location: newCafe.location,
          manager_email: newCafe.manager_email,
          manager_password: newCafe.manager_password,
          manager_name: newCafe.manager_name,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setCreating(false); return; }
      toast.success(`Cafe "${newCafe.name}" created with manager ${newCafe.manager_email}`);
      setDialogOpen(false);
      setNewCafe({ name: '', description: '', location: '', manager_email: '', manager_password: '', manager_name: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create cafe');
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
      const { data, error } = await supabase.functions.invoke('create-delivery-worker', {
        body: {
          worker_name: newWorker.name,
          worker_email: newWorker.email,
          worker_password: newWorker.password,
          worker_phone: newWorker.phone,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setCreatingWorker(false); return; }
      toast.success(`Delivery worker "${newWorker.name}" created with email ${newWorker.email}`);
      setWorkerDialogOpen(false);
      setNewWorker({ name: '', email: '', password: '', phone: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create delivery worker');
    }
    setCreatingWorker(false);
  };

  const deleteCafe = async (id: string) => {
    const { error } = await supabase.from('cafes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cafe deleted');
    fetchData();
  };

  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

  if (loading) return <div className="text-center py-12 text-white/60">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/60">Manage your campus food network</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Store, label: 'Total Cafes', value: cafes.length, color: 'text-amber-400' },
          { icon: ShoppingBag, label: 'Total Orders', value: orders.length, color: 'text-emerald-400' },
          { icon: Truck, label: 'Delivery Workers', value: workers.length, color: 'text-sky-400' },
          { icon: Users, label: 'Revenue', value: `${totalRevenue.toFixed(0)} ETB`, color: 'text-violet-400' },
        ].map((s, i) => (
          <div key={i} className="card-glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-white/50">{s.label}</p>
                <p className="text-lg font-display font-bold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cafes Management */}
      <div className="card-glass rounded-xl">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-display font-bold text-white">Cafes</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Cafe</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Add New Cafe with Manager</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Cafe Details</p>
                  <div><Label>Cafe Name *</Label><Input value={newCafe.name} onChange={e => setNewCafe({ ...newCafe, name: e.target.value })} placeholder="e.g. Science Block Cafe" /></div>
                  <div><Label>Location</Label><Input value={newCafe.location} onChange={e => setNewCafe({ ...newCafe, location: e.target.value })} placeholder="Building, Floor" /></div>
                  <div><Label>Description</Label><Input value={newCafe.description} onChange={e => setNewCafe({ ...newCafe, description: e.target.value })} placeholder="Short description" /></div>
                </div>
                <div className="border-t border-border pt-3 space-y-1">
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
        <div className="px-5 pb-5">
          {cafes.length === 0 ? (
            <p className="text-center text-white/40 py-8">No cafes yet. Add your first cafe!</p>
          ) : (
            <div className="space-y-3">
              {cafes.map(cafe => (
                <div key={cafe.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium text-white">{cafe.name}</p>
                    <p className="text-sm text-white/50">{cafe.location || 'No location'}</p>
                    <p className="text-xs text-white/40">Manager: {getProfileName(cafe.manager_id)}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${cafe.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cafe.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => deleteCafe(cafe.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Workers Management */}
      <div className="card-glass rounded-xl">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-display font-bold text-white">Delivery Workers</h2>
          <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Worker</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
        <div className="px-5 pb-5">
          {workers.length === 0 ? (
            <p className="text-center text-white/40 py-8">No delivery workers yet. Add your first worker!</p>
          ) : (
            <div className="space-y-3">
              {workers.map(worker => (
                <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{getProfileName(worker.user_id)}</p>
                      <div className="flex items-center gap-3">
                        {getProfilePhone(worker.user_id) && (
                          <p className="text-xs text-white/50 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {getProfilePhone(worker.user_id)}
                          </p>
                        )}
                        <p className="text-xs text-white/40">{worker.total_deliveries} deliveries · ⭐ {worker.rating || 'New'}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${worker.is_free ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {worker.is_free ? 'Available' : 'On Delivery'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card-glass rounded-xl">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-display font-bold text-white">Recent Orders</h2>
        </div>
        <div className="px-5 pb-5">
          {orders.length === 0 ? (
            <p className="text-center text-white/40 py-8">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 10).map(order => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
