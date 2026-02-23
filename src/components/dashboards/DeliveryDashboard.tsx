import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, DollarSign, Star, Package } from 'lucide-react';
import { toast } from 'sonner';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [worker, setWorker] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const { data: w } = await supabase.from('delivery_workers').select('*').eq('user_id', user.id).single();
    if (w) {
      setWorker(w);
      const { data: a } = await supabase
        .from('delivery_assignments')
        .select('*, orders(order_code, delivery_type, delivery_full_name, delivery_phone, delivery_building, delivery_dorm_number, delivery_floor, delivery_comments, total_amount, delivery_fee, payment_method, cafes(name), order_items(quantity, unit_price, menu_items(name)))')
        .eq('worker_id', w.id)
        .order('assigned_at', { ascending: false });
      if (a) setAssignments(a);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Realtime assignments
  useEffect(() => {
    if (!worker) return;
    const channel = supabase.channel('delivery-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_assignments', filter: `worker_id=eq.${worker.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [worker]);

  const toggleFree = async () => {
    if (!worker) return;
    await supabase.from('delivery_workers').update({ is_free: !worker.is_free }).eq('id', worker.id);
    toast.success(worker.is_free ? 'Marked as busy' : 'Marked as free');
    fetchData();
  };

  const updateAssignment = async (id: string, status: string) => {
    const update: any = { status };
    if (status === 'picked_up') update.picked_up_at = new Date().toISOString();
    if (status === 'delivered') update.delivered_at = new Date().toISOString();
    await supabase.from('delivery_assignments').update(update).eq('id', id);

    if (status === 'delivered' && worker) {
      await supabase.from('delivery_workers').update({
        total_deliveries: worker.total_deliveries + 1,
        total_earnings: worker.total_earnings + 20,
      }).eq('id', worker.id);
    }

    toast.success(`Status updated to ${status}`);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!worker) return <div className="text-center py-12"><p className="text-muted-foreground">Worker profile not found.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-display font-bold">Your Hunger, <span className="text-primary italic">Our Urgency.</span></h1>
          <p className="text-white/60">Fresh food, fast delivery. Dorm2Door is Yours</p>
        </div>
        <Button onClick={toggleFree} variant={worker.is_free ? 'default' : 'outline'}>
          {worker.is_free ? "I'm Free ✅" : "I'm Busy 🔴"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Package, label: 'Total Deliveries', value: worker.total_deliveries },
          { icon: DollarSign, label: 'Total Earnings', value: `${worker.total_earnings} ETB` },
          { icon: Star, label: 'Rating', value: worker.rating || 'N/A' },
          { icon: Truck, label: 'Status', value: worker.is_free ? 'Free' : 'Busy' },
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

      <Card>
        <CardHeader><CardTitle className="font-display">My Assignments</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No assignments yet. Mark yourself as free to receive deliveries!</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">{a.orders?.order_code}</p>
                      <p className="text-sm text-muted-foreground">{(a.orders as any)?.cafes?.name}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">{a.status}</span>
                  </div>

                  {/* Food items ordered */}
                  {a.orders?.order_items && a.orders.order_items.length > 0 && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-bold text-primary">🍽️ Food Items:</p>
                      {a.orders.order_items.map((oi: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{oi.menu_items?.name || 'Unknown item'}</span>
                          <span className="font-medium">x{oi.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delivery details */}
                  {a.orders && (
                    <div className="text-sm space-y-1 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                      <p className="text-xs font-bold mb-1">📍 Delivery To:</p>
                      <p>👤 {a.orders.delivery_full_name}</p>
                      <p>📞 {a.orders.delivery_phone}</p>
                      <p>🏢 {a.orders.delivery_building}, Dorm {a.orders.delivery_dorm_number}{a.orders.delivery_floor ? `, Floor ${a.orders.delivery_floor}` : ''}</p>
                      {a.orders.delivery_comments && <p>📝 {a.orders.delivery_comments}</p>}
                      <div className="mt-2 pt-2 border-t border-border flex justify-between items-center">
                        <span className="font-semibold">💰 {a.orders.total_amount} ETB</span>
                        <span className="text-xs text-muted-foreground">
                          🚴 Delivery fee: {a.orders.delivery_fee} ETB · {a.orders.payment_method}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {a.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => updateAssignment(a.id, 'accepted')}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => updateAssignment(a.id, 'rejected')}>Reject</Button>
                      </>
                    )}
                    {a.status === 'accepted' && <Button size="sm" onClick={() => updateAssignment(a.id, 'picked_up')}>Picked Up</Button>}
                    {a.status === 'picked_up' && <Button size="sm" onClick={() => updateAssignment(a.id, 'on_the_way')}>On The Way</Button>}
                    {a.status === 'on_the_way' && <Button size="sm" onClick={() => updateAssignment(a.id, 'delivered')}>Delivered ✅</Button>}
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

export default DeliveryDashboard;
