import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingBag, MapPin, Clock, Truck } from 'lucide-react';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [cafes, setCafes] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [orderDialog, setOrderDialog] = useState(false);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryInfo, setDeliveryInfo] = useState({ full_name: '', phone: '', building: '', dorm: '', floor: '', comments: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCafes = async () => {
      const { data } = await supabase.from('cafes').select('*').eq('is_active', true);
      if (data) setCafes(data);
      setLoading(false);
    };
    fetchCafes();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase.from('orders').select('*, cafes(name)').eq('student_id', user.id).order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  // Realtime orders
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('student-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `student_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const selectCafe = async (cafe: any) => {
    setSelectedCafe(cafe);
    const { data } = await supabase.from('menu_items').select('*').eq('cafe_id', cafe.id).eq('is_available', true);
    if (data) setMenuItems(data);
    setCart({});
  };

  const addToCart = (itemId: string) => setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  const removeFromCart = (itemId: string) => setCart(prev => { const n = { ...prev }; if (n[itemId] > 1) n[itemId]--; else delete n[itemId]; return n; });

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const deliveryFee = deliveryType === 'delivery' ? 20 : 0;
  const serviceFee = 5;

  const placeOrder = async () => {
    if (!user || !selectedCafe || Object.keys(cart).length === 0) return;

    const total = cartTotal + deliveryFee + serviceFee;

    const { data: order, error } = await supabase.from('orders').insert({
      student_id: user.id,
      cafe_id: selectedCafe.id,
      order_code: 'TEMP', // trigger will replace
      delivery_type: deliveryType,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      total_amount: total,
      payment_method: paymentMethod,
      delivery_full_name: deliveryInfo.full_name || null,
      delivery_phone: deliveryInfo.phone || null,
      delivery_building: deliveryInfo.building || null,
      delivery_dorm_number: deliveryInfo.dorm || null,
      delivery_floor: deliveryInfo.floor || null,
      delivery_comments: deliveryInfo.comments || null,
    }).select().single();

    if (error || !order) { toast.error(error?.message || 'Failed to place order'); return; }

    // Insert order items
    const items = Object.entries(cart).map(([itemId, qty]) => {
      const mi = menuItems.find(i => i.id === itemId)!;
      return { order_id: order.id, menu_item_id: itemId, quantity: qty, unit_price: mi.price };
    });
    await supabase.from('order_items').insert(items);

    toast.success(`Order placed! Code: ${order.order_code}`);
    setOrderDialog(false);
    setCart({});
    fetchOrders();
  };

  const filtered = menuItems.filter(i =>
    (category === 'All' || i.category === category) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Hello, Student!</h1>
        <p className="text-muted-foreground">What are you craving today?</p>
      </div>

      {!selectedCafe ? (
        <>
          <h2 className="text-lg font-display font-semibold">Campus Cafes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cafes.map(cafe => (
              <Card key={cafe.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectCafe(cafe)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{cafe.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{cafe.location || 'Campus'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cafe.opening_time} - {cafe.closing_time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCafe(null); setMenuItems([]); setCart({}); }}>← Back</Button>
            <h2 className="text-lg font-display font-semibold">{selectedCafe.name}</h2>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search food..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['All', 'Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Snacks'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Menu */}
          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} className="p-4 rounded-lg border border-border flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm font-semibold text-primary">{item.price} ETB</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{item.estimated_prep_time}min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cart[item.id] ? (
                    <>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>-</Button>
                      <span className="w-6 text-center text-sm font-medium">{cart[item.id]}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(item.id)}>+</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(item.id)}>Add</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cart */}
          {Object.keys(cart).length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
              <div className="container mx-auto flex items-center justify-between">
                <div>
                  <p className="font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} items · {cartTotal} ETB</p>
                  <p className="text-xs text-muted-foreground">+ {serviceFee} ETB service fee</p>
                </div>
                <Button onClick={() => setOrderDialog(true)}>Checkout</Button>
              </div>
            </div>
          )}

          {/* Checkout Dialog */}
          <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Complete Your Order</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Delivery Type</Label>
                  <Select value={deliveryType} onValueChange={setDeliveryType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Self Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery (+20 ETB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliveryType === 'delivery' && (
                  <div className="space-y-3 p-3 rounded-lg bg-muted">
                    <div><Label>Full Name</Label><Input value={deliveryInfo.full_name} onChange={e => setDeliveryInfo(prev => ({ ...prev, full_name: e.target.value }))} /></div>
                    <div><Label>Phone</Label><Input value={deliveryInfo.phone} onChange={e => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))} /></div>
                    <div><Label>Building</Label><Input value={deliveryInfo.building} onChange={e => setDeliveryInfo(prev => ({ ...prev, building: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Dorm #</Label><Input value={deliveryInfo.dorm} onChange={e => setDeliveryInfo(prev => ({ ...prev, dorm: e.target.value }))} /></div>
                      <div><Label>Floor</Label><Input value={deliveryInfo.floor} onChange={e => setDeliveryInfo(prev => ({ ...prev, floor: e.target.value }))} /></div>
                    </div>
                    <div><Label>Comments</Label><Input value={deliveryInfo.comments} onChange={e => setDeliveryInfo(prev => ({ ...prev, comments: e.target.value }))} /></div>
                  </div>
                )}

                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash on Pickup</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="telebirr">Telebirr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{cartTotal} ETB</span></div>
                  <div className="flex justify-between text-sm"><span>Service Fee</span><span>{serviceFee} ETB</span></div>
                  {deliveryType === 'delivery' && <div className="flex justify-between text-sm"><span>Delivery Fee</span><span>{deliveryFee} ETB</span></div>}
                  <div className="flex justify-between font-bold"><span>Total</span><span>{cartTotal + serviceFee + deliveryFee} ETB</span></div>
                </div>

                <Button className="w-full" onClick={placeOrder}>Place Order</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* My Orders */}
      <Card>
        <CardHeader><CardTitle className="font-display">My Orders</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders yet. Browse a cafe to get started!</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="p-4 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">{order.order_code}</p>
                      <p className="text-xs text-muted-foreground">{(order as any).cafes?.name} · {order.delivery_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{order.total_amount} ETB</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{order.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
