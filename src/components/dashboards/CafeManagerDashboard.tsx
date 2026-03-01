import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ShoppingBag, Clock, CheckCircle, XCircle, Eye, EyeOff, Truck, Phone, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useNotifications } from '@/hooks/useNotifications';

const CafeManagerDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const { notifications } = useNotifications();
  const [cafe, setCafe] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [freeWorkers, setFreeWorkers] = useState<any[]>([]);
  const [menuDialog, setMenuDialog] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', category: 'Lunch', available_quantity: '10' });
  const [loading, setLoading] = useState(true);
  const [orderTab, setOrderTab] = useState('all');
  const [paymentInfo, setPaymentInfo] = useState({ cbe: '', telebirr: '', ebirr: '' });
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [assignedWorkers, setAssignedWorkers] = useState<Record<string, { name: string; phone: string }>>({});

  const fetchData = async () => {
    if (!user) return;
    const { data: cafeData } = await supabase.from('cafes').select('*').eq('manager_id', user.id).single();
    if (cafeData) {
      setCafe(cafeData);
      const payInfo = (cafeData.payment_info as Record<string, string>) || {};
      setPaymentInfo({ cbe: payInfo.cbe || '', telebirr: payInfo.telebirr || '', ebirr: payInfo.ebirr || '' });

      const [menuRes, ordersRes, workersRes, profilesRes] = await Promise.all([
        supabase.from('menu_items').select('*').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, menu_items(name))').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
        supabase.from('delivery_workers').select('*').eq('is_free', true),
        supabase.from('profiles').select('user_id, full_name, phone'),
      ]);
      if (menuRes.data) setMenuItems(menuRes.data);
      if (ordersRes.data) {
        setOrders(ordersRes.data);
        // Fetch assigned worker info for out_for_delivery orders
        const deliveryOrders = ordersRes.data.filter(o => o.status === 'out_for_delivery');
        if (deliveryOrders.length > 0) {
          const orderIds = deliveryOrders.map(o => o.id);
          const { data: assignments } = await supabase
            .from('delivery_assignments')
            .select('order_id, worker_id, delivery_workers!inner(user_id)')
            .in('order_id', orderIds);
          if (assignments && assignments.length > 0 && profilesRes.data) {
            const infoMap: Record<string, { name: string; phone: string }> = {};
            for (const a of assignments) {
              const workerUserId = (a as any).delivery_workers?.user_id;
              const prof = profilesRes.data.find((p: any) => p.user_id === workerUserId);
              if (prof) {
                infoMap[a.order_id] = { name: prof.full_name || 'Worker', phone: prof.phone || 'N/A' };
              }
            }
            setAssignedWorkers(infoMap);
          }
        }
      }
      if (workersRes.data) setFreeWorkers(workersRes.data);
      if (profilesRes.data) setAllProfiles(profilesRes.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (!cafe) return;
    const channel = supabase
      .channel('manager-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${cafe.id}` }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cafe]);

  const addMenuItem = async () => {
    if (!cafe || !newItem.name || !newItem.price) return;
    const { error } = await supabase.from('menu_items').insert({
      cafe_id: cafe.id,
      name: newItem.name,
      price: parseFloat(newItem.price),
      description: newItem.description,
      category: newItem.category,
      available_quantity: parseInt(newItem.available_quantity) || 10,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Menu item added!');
    setMenuDialog(false);
    setNewItem({ name: '', price: '', description: '', category: 'Lunch', available_quantity: '10' });
    fetchData();
  };

  const toggleAvailability = async (item: any) => {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    toast.success(item.is_available ? 'Item hidden from students' : 'Item visible to students');
    fetchData();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    toast.success(`Order updated to ${status}`);
    fetchData();
  };

  const approvePayment = async (orderId: string) => {
    await supabase.from('orders').update({ payment_status: 'approved', status: 'preparing' }).eq('id', orderId);
    toast.success('Payment approved, order is now preparing');
    fetchData();
  };

  const rejectPayment = async (orderId: string) => {
    await supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', orderId);
    toast.error('Payment rejected');
    fetchData();
  };

  const confirmAvailability = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'available' }).eq('id', orderId);
    toast.success('Confirmed: food is available');
    fetchData();
  };

  const markUnavailable = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'unavailable' }).eq('id', orderId);
    toast.info('Marked as unavailable');
    fetchData();
  };

  const openAssignDialog = (order: any) => {
    setSelectedOrderForAssign(order);
    setAssignDialog(true);
    // Refresh free workers list
    supabase.from('delivery_workers').select('*').eq('is_free', true)
      .then(({ data }) => { if (data) setFreeWorkers(data); });
  };

  const assignDelivery = async (workerId: string) => {
    if (!selectedOrderForAssign) return;
    const order = selectedOrderForAssign;

    const { error } = await supabase.from('delivery_assignments').insert({
      order_id: order.id,
      worker_id: workerId,
    });
    if (error) { toast.error(error.message); return; }

    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', order.id);

    // Get worker info
    const worker = freeWorkers.find(w => w.id === workerId);
    const workerProfile = allProfiles.find(p => p.user_id === worker?.user_id);
    const workerName = workerProfile?.full_name || 'Delivery Worker';

    // Get worker phone from profiles
    const { data: workerPhoneData } = await supabase.from('profiles').select('phone').eq('user_id', worker?.user_id).single();
    const workerPhone = workerPhoneData?.phone || 'N/A';

    if (worker) {
      const itemsList = order.order_items
        ? order.order_items.map((oi: any) => `${oi.menu_items?.name} x${oi.quantity}`).join(', ')
        : 'N/A';
      const deliveryDetails = [
        `📍 ${order.delivery_building || 'N/A'}, Dorm ${order.delivery_dorm_number || 'N/A'}`,
        order.delivery_floor ? `Floor ${order.delivery_floor}` : '',
        `📞 ${order.delivery_phone || 'N/A'}`,
        `👤 ${order.delivery_full_name || 'N/A'}`,
        order.delivery_comments ? `📝 ${order.delivery_comments}` : '',
      ].filter(Boolean).join(' | ');

      // Notify the delivery worker
      await supabase.from('notifications').insert({
        user_id: worker.user_id,
        title: `New Delivery: ${order.order_code}`,
        message: `🍽️ Items: ${itemsList}\n💰 Total: ${order.total_amount} ETB (Delivery fee: ${order.delivery_fee} ETB)\n${deliveryDetails}`,
        type: 'delivery_assignment',
        related_order_id: order.id,
      });

      // Notify the student that a delivery worker is on the way
      await supabase.from('notifications').insert({
        user_id: order.student_id,
        title: `🚴 Delivery on the way!`,
        message: `Your order ${order.order_code} is being delivered by ${workerName} (📞 ${workerPhone}). Please be ready!`,
        type: 'delivery_update',
        related_order_id: order.id,
      });
    }

    toast.success('Delivery assigned! Both worker and student have been notified.');
    setAssignDialog(false);
    setSelectedOrderForAssign(null);
    fetchData();
  };

  const savePaymentInfo = async () => {
    if (!cafe) return;
    await supabase.from('cafes').update({ payment_info: paymentInfo }).eq('id', cafe.id);
    toast.success('Payment info saved');
    setPaymentDialog(false);
    fetchData();
  };

  const filteredOrders = orderTab === 'all' ? orders :
    orderTab === 'pending' ? orders.filter(o => o.status === 'pending_availability') :
      orderTab === 'preparing' ? orders.filter(o => o.status === 'preparing') :
        orderTab === 'ready' ? orders.filter(o => o.status === 'ready') :
          orders;

  if (loading) return <div className="text-center py-12 text-white/60">Loading...</div>;
  if (!cafe) return <div className="text-center py-12"><p className="text-white/60">No cafe assigned to you yet. Contact admin.</p></div>;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{cafe.name}</h1>
          <p className="text-white/60">Your Hunger, <span className="text-primary font-bold italic">Our Urgency.</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPaymentDialog(true)} className="border-white/20 text-white hover:bg-white/10">💳 Payment Info</Button>
        </div>
      </div>

      {/* Payment Info Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="bg-[#1A1F2C] border-white/10 text-white">
          <DialogHeader><DialogTitle className="font-display">Your Payment Accounts</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Students will see these when paying for orders.</p>
          <div className="space-y-3">
            <div><Label>CBE Account Number</Label><Input value={paymentInfo.cbe} onChange={e => setPaymentInfo(p => ({ ...p, cbe: e.target.value }))} placeholder="e.g. 1000123456789" /></div>
            <div><Label>Telebirr Number</Label><Input value={paymentInfo.telebirr} onChange={e => setPaymentInfo(p => ({ ...p, telebirr: e.target.value }))} placeholder="e.g. 0911234567" /></div>
            <div><Label>eBirr Number</Label><Input value={paymentInfo.ebirr} onChange={e => setPaymentInfo(p => ({ ...p, ebirr: e.target.value }))} placeholder="e.g. 0922345678" /></div>
            <Button onClick={savePaymentInfo} className="w-full">Save Payment Info</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Dialog - shows ALL info about the order */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#1A1F2C] border-white/10 text-white">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Truck className="h-5 w-5" /> Assign Delivery Worker</DialogTitle></DialogHeader>
          {selectedOrderForAssign && (
            <div className="space-y-4">
              {/* Order summary */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm font-bold">{selectedOrderForAssign.order_code}</span>
                  <span className="text-sm font-bold text-primary">{selectedOrderForAssign.total_amount} ETB</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Delivery fee: {selectedOrderForAssign.delivery_fee} ETB · Payment: {selectedOrderForAssign.payment_method}
                </p>
              </div>

              {/* Food items */}
              <div className="space-y-1">
                <p className="text-sm font-bold">🍽️ Food Items:</p>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-sm">
                  {selectedOrderForAssign.order_items && selectedOrderForAssign.order_items.length > 0 ? (
                    selectedOrderForAssign.order_items.map((oi: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{oi.menu_items?.name || 'Unknown'}</span>
                        <span className="font-medium">x{oi.quantity} · {oi.unit_price * oi.quantity} ETB</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No item details</p>
                  )}
                </div>
              </div>

              {/* Delivery information */}
              <div className="space-y-1">
                <p className="text-sm font-bold">📍 Delivery Information:</p>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1 text-sm backdrop-blur-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrderForAssign.delivery_full_name || 'N/A'}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrderForAssign.delivery_phone || 'N/A'}</p>
                  <p><span className="font-medium">Building:</span> {selectedOrderForAssign.delivery_building || 'N/A'}</p>
                  <p><span className="font-medium">Dorm #:</span> {selectedOrderForAssign.delivery_dorm_number || 'N/A'}</p>
                  {selectedOrderForAssign.delivery_floor && (
                    <p><span className="font-medium">Floor:</span> {selectedOrderForAssign.delivery_floor}</p>
                  )}
                  {selectedOrderForAssign.delivery_comments && (
                    <p><span className="font-medium">Comments:</span> {selectedOrderForAssign.delivery_comments}</p>
                  )}
                </div>
              </div>

              {/* Available delivery workers */}
              <div className="space-y-2">
                <p className="text-sm font-bold">🚴 Available Workers ({freeWorkers.length}):</p>
                {freeWorkers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No free workers available right now. Try again later.</p>
                ) : (
                  <div className="space-y-2">
                    {freeWorkers.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{allProfiles.find(p => p.user_id === w.user_id)?.full_name || 'Worker'}</p>
                          <p className="text-xs text-muted-foreground">{w.total_deliveries} deliveries · ⭐ {w.rating || 'New'}</p>
                        </div>
                        <Button size="sm" onClick={() => assignDelivery(w.id)}>
                          <Truck className="h-3 w-3 mr-1" /> Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentTab === 'home' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShoppingBag, label: 'Total Orders', value: orders.length, color: 'text-amber-400' },
              { icon: Clock, label: 'Pending', value: orders.filter(o => o.status === 'pending_availability').length, color: 'text-sky-400' },
              { icon: CheckCircle, label: 'Preparing', value: orders.filter(o => o.status === 'preparing').length, color: 'text-emerald-400' },
              { icon: XCircle, label: 'Menu Items', value: menuItems.length, color: 'text-violet-400' },
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

          <div className="mt-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Utensils className="h-24 w-24 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Welcome Back, Chef!</h2>
            <p className="text-white/60 text-sm max-w-md">Manage your menu, track orders, and keep the campus fed. You're doing a great job!</p>
            <div className="mt-4 flex gap-3">
              <Button size="sm" className="font-bold" onClick={() => window.location.href = '/dashboard?tab=menu'}>Manage Menu</Button>
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => window.location.href = '/dashboard?tab=orders'}>Check Orders</Button>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'menu' && (
        <div className="card-glass rounded-xl animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="text-lg font-display font-bold text-white">Menu Items</h2>
            <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
              <DialogContent className="bg-[#1A1F2C] border-white/10 text-white">
                <DialogHeader><DialogTitle className="font-display">Add Menu Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div><Label>Price (ETB)</Label><Input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} /></div>
                  <div><Label>Description</Label><Input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Snacks'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Available Quantity</Label><Input type="number" value={newItem.available_quantity} onChange={e => setNewItem({ ...newItem, available_quantity: e.target.value })} /></div>
                  <Button onClick={addMenuItem} className="w-full">Add Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="px-5 pb-5">
            {menuItems.length === 0 ? (
              <p className="text-center text-white/40 py-8">No menu items. Add your first item!</p>
            ) : (
              <div className="grid gap-3">
                {menuItems.map(item => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 ${!item.is_available ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="font-medium text-white">{item.name} {!item.is_available && <span className="text-xs text-white/40">(hidden)</span>}</p>
                      <p className="text-sm text-white/50">{item.category} · {item.price} ETB · Qty: {item.available_quantity}</p>
                    </div>
                    <Button variant={item.is_available ? 'outline' : 'default'} size="sm" onClick={() => toggleAvailability(item)} className={item.is_available ? 'border-white/20 text-white hover:bg-white/10' : ''}>
                      {item.is_available ? <><EyeOff className="h-3 w-3 mr-1" /> Hide</> : <><Eye className="h-3 w-3 mr-1" /> Show</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'orders' && (
        <div className="card-glass rounded-xl animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-display font-bold text-white">Orders</h2>
            <Tabs value={orderTab} onValueChange={setOrderTab} className="mt-2">
              <TabsList className="bg-white/5">
                <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({orders.filter(o => o.status === 'pending_availability').length})</TabsTrigger>
                <TabsTrigger value="preparing">Preparing ({orders.filter(o => o.status === 'preparing').length})</TabsTrigger>
                <TabsTrigger value="ready">Ready ({orders.filter(o => o.status === 'ready').length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="px-5 pb-5">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-white/40 py-8">No orders in this category.</p>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm font-bold text-white">{order.order_code}</p>
                        <p className="text-xs text-white/50">
                          {order.delivery_type === 'delivery' ? '🚴 Delivery' : '🏪 Pickup'} · {order.total_amount} ETB · Payment: {order.payment_status}
                        </p>
                        {order.delivery_type === 'delivery' && (
                          <p className="text-xs text-amber-400 font-medium mt-0.5">
                            Delivery fee: {order.delivery_fee} ETB included
                          </p>
                        )}
                        {order.order_items && order.order_items.length > 0 && (
                          <p className="text-xs text-white/40 mt-1">
                            Items: {order.order_items.map((oi: any) => `${oi.menu_items?.name} x${oi.quantity}`).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">{order.status.replace(/_/g, ' ')}</span>
                    </div>

                    {/* Show delivery info for delivery orders */}
                    {order.delivery_type === 'delivery' && (
                      <div className="text-xs p-2 rounded bg-sky-500/10 border border-sky-500/20 space-y-0.5 text-white/80">
                        <p className="font-semibold text-sky-400">📍 Delivery Details:</p>
                        <p>👤 {order.delivery_full_name} · 📞 {order.delivery_phone}</p>
                        <p>🏢 {order.delivery_building}, Dorm {order.delivery_dorm_number}{order.delivery_floor ? `, Floor ${order.delivery_floor}` : ''}</p>
                        {order.delivery_comments && <p>📝 {order.delivery_comments}</p>}
                      </div>
                    )}

                    {/* Payment screenshot */}
                    {order.payment_screenshot_url && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/70">Payment Screenshot:</p>
                        <img src={order.payment_screenshot_url} alt="Payment proof" className="max-w-xs rounded-lg border border-white/10 cursor-pointer" onClick={() => window.open(order.payment_screenshot_url, '_blank')} />
                      </div>
                    )}

                    {/* Availability check - student asks if food available */}
                    {order.status === 'pending_availability' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmAvailability(order.id)}>✅ Yes Available</Button>
                        <Button size="sm" variant="destructive" onClick={() => markUnavailable(order.id)}>❌ Finished</Button>
                      </div>
                    )}

                    {/* Payment approval */}
                    {order.payment_status === 'pending' && order.payment_screenshot_url && order.status === 'available' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approvePayment(order.id)}>Approve Payment</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectPayment(order.id)}>Reject</Button>
                      </div>
                    )}

                    {order.status === 'preparing' && (
                      <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>
                    )}

                    {order.status === 'ready' && order.delivery_type === 'delivery' && (
                      <Button size="sm" onClick={() => openAssignDialog(order)} className="gap-1">
                        <Truck className="h-3 w-3" /> Assign to Delivery Worker
                      </Button>
                    )}

                    {order.status === 'ready' && order.delivery_type === 'pickup' && (
                      <p className="text-xs text-amber-400 font-medium">🔔 Student can pick up now</p>
                    )}

                    {order.status === 'out_for_delivery' && assignedWorkers[order.id] && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <p className="text-xs font-bold text-emerald-400 mb-1">🚚 Assigned Delivery Worker:</p>
                        <p className="text-sm text-white flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5 text-emerald-400" />
                          {assignedWorkers[order.id].name}
                        </p>
                        <p className="text-sm text-white flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                          <a href={`tel:${assignedWorkers[order.id].phone}`} className="underline hover:text-emerald-400 transition-colors">
                            {assignedWorkers[order.id].phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'alerts' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="card-glass rounded-xl overflow-hidden border-white/5">
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-white">Notifications</h2>
                <p className="text-xs text-white/40">Stay updated on orders and system alerts</p>
              </div>
              <Bell className="h-5 w-5 text-primary opacity-50" />
            </div>
            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-20">
                  <Bell className="h-12 w-12 text-white/5 mx-auto mb-4" />
                  <p className="text-white/30 font-display">No alerts yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((n: any) => (
                    <div key={n.id} className={cn(
                      "p-4 rounded-lg transition-all",
                      n.is_read ? "bg-transparent opacity-60" : "bg-white/5 border border-white/5"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          n.type === 'order_status' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                        )}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-white flex items-center justify-between">
                            {n.title}
                            <span className="font-normal text-[9px] text-white/20">{formatDateTime(n.created_at)}</span>
                          </p>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CafeManagerDashboard;
