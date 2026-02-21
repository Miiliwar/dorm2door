import { useState, useEffect } from 'react';
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
import { Plus, ShoppingBag, Clock, CheckCircle, XCircle, Eye, EyeOff, Truck } from 'lucide-react';
import { toast } from 'sonner';

const CafeManagerDashboard = () => {
  const { user } = useAuth();
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

  const fetchData = async () => {
    if (!user) return;
    const { data: cafeData } = await supabase.from('cafes').select('*').eq('manager_id', user.id).single();
    if (cafeData) {
      setCafe(cafeData);
      const payInfo = (cafeData.payment_info as Record<string, string>) || {};
      setPaymentInfo({ cbe: payInfo.cbe || '', telebirr: payInfo.telebirr || '', ebirr: payInfo.ebirr || '' });
      
      const [menuRes, ordersRes, workersRes] = await Promise.all([
        supabase.from('menu_items').select('*').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, menu_items(name))').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
        supabase.from('delivery_workers').select('*, profiles!delivery_workers_user_id_fkey(full_name)').eq('is_free', true),
      ]);
      if (menuRes.data) setMenuItems(menuRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (workersRes.data) setFreeWorkers(workersRes.data);
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

  const assignDelivery = async (orderId: string, workerId: string) => {
    const { error } = await supabase.from('delivery_assignments').insert({
      order_id: orderId,
      worker_id: workerId,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', orderId);
    toast.success('Delivery assigned!');
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

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!cafe) return <div className="text-center py-12"><p className="text-muted-foreground">No cafe assigned to you yet. Contact admin.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold">{cafe.name}</h1>
          <p className="text-muted-foreground">Manage your menu and orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPaymentDialog(true)}>💳 Payment Info</Button>
      </div>

      {/* Payment Info Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, label: 'Total Orders', value: orders.length },
          { icon: Clock, label: 'Pending', value: orders.filter(o => o.status === 'pending_availability').length },
          { icon: CheckCircle, label: 'Preparing', value: orders.filter(o => o.status === 'preparing').length },
          { icon: XCircle, label: 'Menu Items', value: menuItems.length },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-display font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Menu Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Menu Items</CardTitle>
          <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
            <DialogContent>
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
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No menu items. Add your first item!</p>
          ) : (
            <div className="grid gap-3">
              {menuItems.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border border-border ${!item.is_available ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-medium">{item.name} {!item.is_available && <span className="text-xs text-muted-foreground">(hidden)</span>}</p>
                    <p className="text-sm text-muted-foreground">{item.category} · {item.price} ETB · Qty: {item.available_quantity}</p>
                  </div>
                  <Button variant={item.is_available ? 'outline' : 'default'} size="sm" onClick={() => toggleAvailability(item)}>
                    {item.is_available ? <><EyeOff className="h-3 w-3 mr-1" /> Hide</> : <><Eye className="h-3 w-3 mr-1" /> Show</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Orders</CardTitle>
          <Tabs value={orderTab} onValueChange={setOrderTab} className="mt-2">
            <TabsList>
              <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({orders.filter(o => o.status === 'pending_availability').length})</TabsTrigger>
              <TabsTrigger value="preparing">Preparing ({orders.filter(o => o.status === 'preparing').length})</TabsTrigger>
              <TabsTrigger value="ready">Ready ({orders.filter(o => o.status === 'ready').length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders in this category.</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">{order.order_code}</p>
                      <p className="text-xs text-muted-foreground">{order.delivery_type} · {order.total_amount} ETB · Payment: {order.payment_status}</p>
                      {order.order_items && order.order_items.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Items: {order.order_items.map((oi: any) => `${oi.menu_items?.name} x${oi.quantity}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">{order.status.replace(/_/g, ' ')}</span>
                  </div>

                  {/* Payment screenshot */}
                  {order.payment_screenshot_url && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Payment Screenshot:</p>
                      <img src={order.payment_screenshot_url} alt="Payment proof" className="max-w-xs rounded-lg border border-border" />
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
                    <div className="space-y-2">
                      <p className="text-xs font-medium flex items-center gap-1"><Truck className="h-3 w-3" /> Assign Delivery Worker:</p>
                      {freeWorkers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No free workers available</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {freeWorkers.map(w => (
                            <Button key={w.id} size="sm" variant="outline" onClick={() => assignDelivery(order.id, w.id)}>
                              {(w as any).profiles?.full_name || 'Worker'}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'ready' && order.delivery_type === 'pickup' && (
                    <p className="text-xs text-primary font-medium">🔔 Student can pick up now</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeManagerDashboard;
