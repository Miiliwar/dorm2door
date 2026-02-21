import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const CafeManagerDashboard = () => {
  const { user } = useAuth();
  const [cafe, setCafe] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuDialog, setMenuDialog] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', category: 'Lunch', available_quantity: '10' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const { data: cafeData } = await supabase.from('cafes').select('*').eq('manager_id', user.id).single();
    if (cafeData) {
      setCafe(cafeData);
      const [menuRes, ordersRes] = await Promise.all([
        supabase.from('menu_items').select('*').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('cafe_id', cafeData.id).order('created_at', { ascending: false }),
      ]);
      if (menuRes.data) setMenuItems(menuRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Realtime orders
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

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!cafe) return <div className="text-center py-12"><p className="text-muted-foreground">No cafe assigned to you yet. Contact admin.</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">{cafe.name}</h1>
        <p className="text-muted-foreground">Manage your menu and orders</p>
      </div>

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
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.category} · {item.price} ETB · Qty: {item.available_quantity}</p>
                  </div>
                  <Button variant={item.is_available ? 'outline' : 'default'} size="sm" onClick={() => toggleAvailability(item)}>
                    {item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader><CardTitle className="font-display">Orders</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">{order.order_code}</p>
                      <p className="text-xs text-muted-foreground">{order.delivery_type} · {order.total_amount} ETB</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">{order.status}</span>
                  </div>
                  {order.payment_status === 'pending' && order.payment_screenshot_url && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approvePayment(order.id)}>Approve Payment</Button>
                      <Button size="sm" variant="destructive" onClick={() => supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', order.id).then(fetchData)}>Reject</Button>
                    </div>
                  )}
                  {order.status === 'pending_availability' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateOrderStatus(order.id, 'available')}>Available</Button>
                      <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'unavailable')}>Not Available</Button>
                    </div>
                  )}
                  {order.status === 'preparing' && (
                    <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>
                  )}
                  {order.status === 'ready' && order.delivery_type === 'delivery' && (
                    <Button size="sm" onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}>Out for Delivery</Button>
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
