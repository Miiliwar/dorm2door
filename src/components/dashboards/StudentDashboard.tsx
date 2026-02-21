import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingBag, MapPin, Clock, Truck, Upload, CreditCard, CheckCircle, CalendarDays, PackageCheck, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [cafes, setCafes] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [orderDialog, setOrderDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [currentOrderForPayment, setCurrentOrderForPayment] = useState<any>(null);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryInfo, setDeliveryInfo] = useState({ full_name: '', phone: '', building: '', dorm: '', floor: '', comments: '' });
  const [paymentMethod, setPaymentMethod] = useState('chapa');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const [deliveryWorkerInfo, setDeliveryWorkerInfo] = useState<Record<string, { name: string; phone: string }>>({});

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase.from('orders').select('*, cafes(name, payment_info)').eq('student_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
      // Fetch delivery worker info for orders that are out_for_delivery
      const deliveryOrders = data.filter(o => o.status === 'out_for_delivery');
      if (deliveryOrders.length > 0) {
        const orderIds = deliveryOrders.map(o => o.id);
        const { data: assignments } = await supabase
          .from('delivery_assignments')
          .select('order_id, worker_id, delivery_workers!inner(user_id)')
          .in('order_id', orderIds);
        if (assignments && assignments.length > 0) {
          const workerUserIds = assignments.map((a: any) => a.delivery_workers?.user_id).filter(Boolean);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone')
            .in('user_id', workerUserIds);
          const infoMap: Record<string, { name: string; phone: string }> = {};
          for (const a of assignments) {
            const workerUserId = (a as any).delivery_workers?.user_id;
            const prof = profiles?.find(p => p.user_id === workerUserId);
            if (prof) {
              infoMap[a.order_id] = { name: prof.full_name || 'Delivery Worker', phone: prof.phone || 'N/A' };
            }
          }
          setDeliveryWorkerInfo(prev => ({ ...prev, ...infoMap }));
        }
      }
    }
  };

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
  const grandTotal = cartTotal + deliveryFee + serviceFee;

  const placeOrder = async () => {
    if (!user || !selectedCafe || Object.keys(cart).length === 0) return;

    // Validate delivery fields
    if (deliveryType === 'delivery') {
      if (!deliveryInfo.full_name.trim() || !deliveryInfo.phone.trim() || !deliveryInfo.building.trim() || !deliveryInfo.dorm.trim()) {
        toast.error('Please fill in all required delivery fields (Name, Phone, Building, Dorm Number)');
        return;
      }
    }

    const { data: order, error } = await supabase.from('orders').insert({
      student_id: user.id,
      cafe_id: selectedCafe.id,
      order_code: 'TEMP',
      delivery_type: deliveryType,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      delivery_full_name: deliveryInfo.full_name || profile?.full_name || null,
      delivery_phone: deliveryInfo.phone || null,
      delivery_building: deliveryInfo.building || null,
      delivery_dorm_number: deliveryInfo.dorm || null,
      delivery_floor: deliveryInfo.floor || null,
      delivery_comments: deliveryInfo.comments || null,
    }).select().single();

    if (error || !order) { toast.error(error?.message || 'Failed to place order'); return; }

    const items = Object.entries(cart).map(([itemId, qty]) => {
      const mi = menuItems.find(i => i.id === itemId)!;
      return { order_id: order.id, menu_item_id: itemId, quantity: qty, unit_price: mi.price };
    });
    await supabase.from('order_items').insert(items);

    toast.success(`Order placed! Code: ${order.order_code}. Checking availability with cafe...`);
    setOrderDialog(false);
    setCart({});
    setDeliveryType('pickup');
    setDeliveryInfo({ full_name: '', phone: '', building: '', dorm: '', floor: '', comments: '' });
    fetchOrders();
  };

  const openPaymentUpload = (order: any) => {
    setCurrentOrderForPayment(order);
    setPaymentDialog(true);
  };

  const uploadScreenshot = async (file: File) => {
    if (!currentOrderForPayment || !user) return;
    setUploading(true);
    const path = `${user.id}/${currentOrderForPayment.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('payment-screenshots').upload(path, file);
    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('payment-screenshots').getPublicUrl(path);

    await supabase.from('orders').update({
      payment_screenshot_url: urlData.publicUrl,
      payment_status: 'pending',
    }).eq('id', currentOrderForPayment.id);

    toast.success('Payment screenshot uploaded! Waiting for cafe to verify.');
    setPaymentDialog(false);
    setUploading(false);
    fetchOrders();
  };

  const filtered = menuItems.filter(i =>
    (category === 'All' || i.category === category) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending_availability: 'bg-warning/10 text-warning',
      available: 'bg-success/10 text-success',
      unavailable: 'bg-destructive/10 text-destructive',
      preparing: 'bg-primary/10 text-primary',
      ready: 'bg-success/10 text-success',
      out_for_delivery: 'bg-primary/10 text-primary',
      delivered: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-accent text-accent-foreground';
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const confirmReceived = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    toast.success('Order confirmed as received! Thank you.');
    fetchOrders();
  };

  if (loading) return <div className="text-center py-12 text-white/60">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Hello, {profile?.full_name || 'Student'}!</h1>
        <p className="text-white/60">What are you craving today?</p>
      </div>

      {!selectedCafe ? (
        <>
          <h2 className="text-lg font-display font-semibold text-white">Campus Cafes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cafes.map(cafe => (
              <div key={cafe.id} className="card-glass rounded-xl cursor-pointer hover:bg-white/15 transition-all" onClick={() => selectCafe(cafe)}>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white">{cafe.name}</h3>
                      <p className="text-sm text-white/50 flex items-center gap-1"><MapPin className="h-3 w-3" />{cafe.location || 'Campus'}</p>
                      <p className="text-xs text-white/40 mt-1">{cafe.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCafe(null); setMenuItems([]); setCart({}); }} className="text-white/70 hover:text-white hover:bg-white/10">← Back</Button>
            <h2 className="text-lg font-display font-semibold text-white">{selectedCafe.name}</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="Search food..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['All', 'Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Snacks'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-sm text-white/50">{item.description}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm font-semibold text-amber-400">{item.price} ETB</span>
                    <span className="text-xs text-white/40 flex items-center gap-1"><Clock className="h-3 w-3" />{item.estimated_prep_time}min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cart[item.id] ? (
                    <>
                      <Button size="icon" variant="outline" className="h-8 w-8 border-white/20 text-white hover:bg-white/10" onClick={() => removeFromCart(item.id)}>-</Button>
                      <span className="w-6 text-center text-sm font-medium text-white">{cart[item.id]}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8 border-white/20 text-white hover:bg-white/10" onClick={() => addToCart(item.id)}>+</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(item.id)}>Add</Button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-white/40 py-8 col-span-2">No items found.</p>}
          </div>

          {Object.keys(cart).length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 p-4 z-40">
              <div className="container mx-auto flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{Object.values(cart).reduce((a, b) => a + b, 0)} items · {grandTotal} ETB</p>
                  <p className="text-xs text-white/50">
                    {cartTotal} food + {serviceFee} service
                    {deliveryType === 'delivery' && ` + ${deliveryFee} delivery`}
                  </p>
                </div>
                <Button onClick={() => setOrderDialog(true)} className="shadow-lg shadow-primary/30">Check if Available Now</Button>
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
                    <p className="text-sm font-semibold">Delivery Information</p>
                    <div><Label>Full Name *</Label><Input value={deliveryInfo.full_name} onChange={e => setDeliveryInfo(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Your full name" /></div>
                    <div><Label>Phone *</Label><Input value={deliveryInfo.phone} onChange={e => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))} placeholder="0911234567" /></div>
                    <div><Label>Building Name *</Label><Input value={deliveryInfo.building} onChange={e => setDeliveryInfo(prev => ({ ...prev, building: e.target.value }))} placeholder="e.g. Block 5" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Dorm Number *</Label><Input value={deliveryInfo.dorm} onChange={e => setDeliveryInfo(prev => ({ ...prev, dorm: e.target.value }))} placeholder="e.g. 301" /></div>
                      <div><Label>Floor</Label><Input value={deliveryInfo.floor} onChange={e => setDeliveryInfo(prev => ({ ...prev, floor: e.target.value }))} placeholder="e.g. 3" /></div>
                    </div>
                    <div><Label>Comments</Label><Textarea value={deliveryInfo.comments} onChange={e => setDeliveryInfo(prev => ({ ...prev, comments: e.target.value }))} placeholder="Special instructions..." /></div>
                  </div>
                )}

                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chapa">Chapa</SelectItem>
                      <SelectItem value="empesa">eMpesa</SelectItem>
                      <SelectItem value="cbe">CBE (Bank Transfer)</SelectItem>
                      <SelectItem value="telebirr">Telebirr</SelectItem>
                      <SelectItem value="ebirr">eBirr</SelectItem>
                      <SelectItem value="cash">{deliveryType === 'delivery' ? 'Cash on Delivery' : 'Cash on Pickup'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{cartTotal} ETB</span></div>
                  <div className="flex justify-between text-sm"><span>Service Fee</span><span>{serviceFee} ETB</span></div>
                  {deliveryType === 'delivery' && (
                    <div className="flex justify-between text-sm text-primary font-medium">
                      <span>🚴 Delivery Fee</span><span>+{deliveryFee} ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
                    <span>Total</span><span>{grandTotal} ETB</span>
                  </div>
                </div>

                <Button className="w-full" onClick={placeOrder}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Check Availability & Place Order
                </Button>
                <p className="text-xs text-muted-foreground text-center">The cafe will confirm if the food is available. You'll be notified to pay.</p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Payment Upload Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Upload Payment Screenshot</DialogTitle></DialogHeader>
          {currentOrderForPayment && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">Order: {currentOrderForPayment.order_code}</p>
                <p className="text-sm font-bold text-primary">Amount: {currentOrderForPayment.total_amount} ETB</p>
                <p className="text-xs text-muted-foreground">Method: {currentOrderForPayment.payment_method}</p>
              </div>

              {/* Show cafe payment info */}
              {currentOrderForPayment.cafes?.payment_info && (
                <div className="p-3 rounded-lg border border-border space-y-1">
                  <p className="text-sm font-semibold">Pay to these accounts:</p>
                  {(currentOrderForPayment.cafes.payment_info as any).cbe && (
                    <p className="text-sm">🏦 CBE: <span className="font-mono font-medium">{(currentOrderForPayment.cafes.payment_info as any).cbe}</span></p>
                  )}
                  {(currentOrderForPayment.cafes.payment_info as any).telebirr && (
                    <p className="text-sm">📱 Telebirr: <span className="font-mono font-medium">{(currentOrderForPayment.cafes.payment_info as any).telebirr}</span></p>
                  )}
                  {(currentOrderForPayment.cafes.payment_info as any).ebirr && (
                    <p className="text-sm">💳 eBirr: <span className="font-mono font-medium">{(currentOrderForPayment.cafes.payment_info as any).ebirr}</span></p>
                  )}
                  {!(currentOrderForPayment.cafes.payment_info as any).cbe && !(currentOrderForPayment.cafes.payment_info as any).telebirr && (
                    <p className="text-xs text-muted-foreground">Payment accounts not set by cafe yet.</p>
                  )}
                </div>
              )}

              <div>
                <Label>Upload Screenshot</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadScreenshot(file);
                  }}
                />
                <Button variant="outline" className="w-full mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Choose Screenshot'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* My Orders */}
      <div className="card-glass rounded-xl">
        <div className="p-5 pb-3"><h2 className="text-lg font-display font-bold text-white">My Orders</h2></div>
        <div className="px-5 pb-5">
          {orders.length === 0 ? (
            <p className="text-center text-white/40 py-8">No orders yet. Browse a cafe to get started!</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold text-white">{order.order_code}</p>
                      <p className="text-xs text-white/50">{(order as any).cafes?.name} · {order.delivery_type === 'delivery' ? '🚴 Delivery' : '🏪 Pickup'} · {order.payment_method}</p>
                      <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" />
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{order.total_amount} ETB</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Available - prompt payment */}
                  {order.status === 'available' && !order.payment_screenshot_url && order.payment_method !== 'cash' && (
                    <div className="p-2 rounded bg-success/10 border border-success/20">
                      <p className="text-sm text-success font-medium">✅ Food is available! Please pay and upload screenshot.</p>
                      <Button size="sm" className="mt-2" onClick={() => openPaymentUpload(order)}>
                        <CreditCard className="h-3 w-3 mr-1" /> Upload Payment Screenshot
                      </Button>
                    </div>
                  )}

                  {order.status === 'available' && order.payment_method === 'cash' && (
                    <p className="text-sm text-success font-medium">✅ Food is available! Pay cash on {order.delivery_type === 'delivery' ? 'delivery' : 'pickup'}.</p>
                  )}

                  {order.payment_status === 'pending' && order.payment_screenshot_url && (
                    <p className="text-xs text-warning">⏳ Payment screenshot uploaded. Waiting for verification...</p>
                  )}

                  {order.payment_status === 'approved' && order.status === 'preparing' && (
                    <p className="text-xs text-primary">🍳 Your food is being prepared...</p>
                  )}

                  {order.status === 'ready' && (
                    <div className="space-y-2">
                      <p className="text-sm text-success font-medium">🎉 Your food is ready! {order.delivery_type === 'pickup' ? 'Pick it up now!' : 'Delivery worker will bring it.'}</p>
                      {order.delivery_type === 'pickup' && (
                        <Button size="sm" variant="default" className="gap-1.5" onClick={() => confirmReceived(order.id)}>
                          <PackageCheck className="h-4 w-4" /> I Picked It Up — Confirm Received
                        </Button>
                      )}
                    </div>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-400 font-medium">🚴 Your food is on the way!</p>
                      {deliveryWorkerInfo[order.id] && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                          <p className="text-xs font-bold text-emerald-400 mb-1">� Your Delivery Worker:</p>
                          <p className="text-sm text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-400" />
                            {deliveryWorkerInfo[order.id].name}
                          </p>
                          <p className="text-sm text-white flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-emerald-400" />
                            <a href={`tel:${deliveryWorkerInfo[order.id].phone}`} className="underline hover:text-emerald-400 transition-colors">
                              {deliveryWorkerInfo[order.id].phone}
                            </a>
                          </p>
                        </div>
                      )}
                      <Button size="sm" variant="default" className="gap-1.5" onClick={() => confirmReceived(order.id)}>
                        <PackageCheck className="h-4 w-4" /> I Got It — Confirm Received
                      </Button>
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <p className="text-xs text-white/40 flex items-center gap-1">✅ Received · {order.updated_at ? formatDateTime(order.updated_at) : ''}</p>
                  )}

                  {order.status === 'unavailable' && (
                    <p className="text-sm text-red-400 font-medium">❌ Sorry, this food is currently unavailable.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
