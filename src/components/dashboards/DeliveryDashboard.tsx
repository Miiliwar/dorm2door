import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck, DollarSign, Star, Package, Bell,
  LayoutDashboard, History, CheckCircle, Clock,
  MapPin, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import { cn, formatDateTime } from '@/lib/utils';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const { notifications } = useNotifications();
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
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-display font-bold">Your Hunger, <span className="text-primary italic">Our Urgency.</span></h1>
          <p className="text-white/60">Fresh food, fast delivery. Dorm2Door is Yours</p>
        </div>
        <Button onClick={toggleFree} variant={worker.is_free ? 'default' : 'outline'} className={cn(
          "font-bold transition-all duration-500",
          worker.is_free ? "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] shadow-emerald-500/20" : "border-white/20 text-white hover:bg-white/10"
        )}>
          {worker.is_free ? "Available ✅" : "On Break / Busy 🔴"}
        </Button>
      </div>

      {currentTab === 'home' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Package, label: 'Completed', value: worker.total_deliveries, color: 'text-emerald-400' },
              { icon: DollarSign, label: 'Total Earnings', value: `${worker.total_earnings} ETB`, color: 'text-amber-400' },
              { icon: Star, label: 'Your Rating', value: worker.rating || 'New', color: 'text-violet-400' },
              { icon: Truck, label: 'Mode', value: worker.is_free ? 'Waiting' : 'On Task', color: 'text-sky-400' },
            ].map((s, i) => (
              <div key={i} className="card-glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                    <p className="text-lg font-display font-bold text-white">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Truck className="h-24 w-24 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Ready for some fuel?</h2>
            <p className="text-white/60 text-sm max-w-md">The campus is hungry and you're the hero they need. Stay active to receive more delivery requests!</p>
            <div className="mt-4 flex gap-3">
              <Button size="sm" onClick={() => window.location.href = '/dashboard?tab=deliver'}>Check Requests</Button>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-[#1A1F2C] bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">W{i}</div>
                ))}
              </div>
              <span className="text-xs text-white/30 flex items-center">Join 20+ active workers</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-glass rounded-xl p-5 border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 underline underline-offset-4 decoration-primary/50">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              <div className="space-y-4">
                {assignments.slice(0, 3).map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between border-l-2 border-white/10 pl-3">
                    <div>
                      <p className="text-xs font-bold text-white">{a.orders?.order_code}</p>
                      <p className="text-[10px] text-white/40">{(a.orders as any)?.cafes?.name}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-white/60 capitalize">{a.status}</span>
                  </div>
                ))}
                {assignments.length === 0 && <p className="text-xs text-white/20 text-center py-4 italic">No recent activity</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'deliver' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="card-glass rounded-xl overflow-hidden border-white/5">
            <div className="p-5 bg-white/5 border-b border-white/5">
              <h2 className="text-lg font-display font-bold text-white">Active Assignments</h2>
              <p className="text-xs text-white/40">Manage your current pick-ups and deliveries</p>
            </div>
            <div className="p-4">
              {assignments.filter(a => a.status !== 'delivered' && a.status !== 'rejected').length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 animate-pulse">
                    <Truck className="h-8 w-8 text-white/20" />
                  </div>
                  <div>
                    <p className="text-white/40 font-display">No active assignments</p>
                    <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest">New requests will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.filter(a => a.status !== 'delivered' && a.status !== 'rejected').map(a => (
                    <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm font-bold text-primary">{a.orders?.order_code}</p>
                          <p className="text-sm font-bold text-white">{(a.orders as any)?.cafes?.name}</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-widest">{a.status.replace(/_/g, ' ')}</span>
                      </div>

                      {/* Food items ordered */}
                      {a.orders?.order_items && a.orders.order_items.length > 0 && (
                        <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-1">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Pick up items:</p>
                          {a.orders.order_items.map((oi: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-white/80">
                              <span className="font-medium">• {oi.menu_items?.name || 'Unknown item'}</span>
                              <span className="font-black text-primary">x{oi.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Delivery details */}
                      {a.orders && (
                        <div className="text-sm space-y-2 bg-white/5 border border-white/5 p-4 rounded-xl backdrop-blur-sm shadow-inner group-hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Deliver To:</span>
                          </div>
                          <div className="pl-5 space-y-1">
                            <p className="text-sm font-bold text-white">{a.orders.delivery_full_name}</p>
                            <a href={`tel:${a.orders.delivery_phone}`} className="text-xs text-primary flex items-center gap-1.5 hover:underline">
                              <Phone className="h-3 w-3" /> {a.orders.delivery_phone}
                            </a>
                            <p className="text-xs text-white/70">
                              <span className="font-bold text-white">🏢 {a.orders.delivery_building}</span>, Dorm {a.orders.delivery_dorm_number}{a.orders.delivery_floor ? `, Floor ${a.orders.delivery_floor}` : ''}
                            </p>
                            {a.orders.delivery_comments && (
                              <p className="text-xs text-white/40 italic bg-black/20 p-2 rounded-lg mt-2 border-l-2 border-primary/30">
                                "{a.orders.delivery_comments}"
                              </p>
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="font-bold text-white text-base">{a.orders.total_amount} <span className="text-[10px] text-white/40">ETB</span></span>
                            <div className="text-right">
                              <p className="text-[9px] text-white/30 uppercase font-black">Delivery Earning</p>
                              <p className="text-emerald-400 font-bold">{a.orders.delivery_fee} ETB · {a.orders.payment_method}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {a.status === 'pending' && (
                          <>
                            <Button className="flex-1 font-bold" onClick={() => updateAssignment(a.id, 'accepted')}>Accept Request</Button>
                            <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-white/60" onClick={() => updateAssignment(a.id, 'rejected')}>Reject</Button>
                          </>
                        )}
                        {a.status === 'accepted' && (
                          <Button className="w-full font-bold h-12 text-base" onClick={() => updateAssignment(a.id, 'picked_up')}>Confirm Pick Up</Button>
                        )}
                        {a.status === 'picked_up' && (
                          <Button className="w-full font-bold h-12 text-base" onClick={() => updateAssignment(a.id, 'on_the_way')}>On The Way</Button>
                        )}
                        {a.status === 'on_the_way' && (
                          <Button className="w-full font-bold h-12 text-base bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] shadow-emerald-500/20" onClick={() => updateAssignment(a.id, 'delivered')}>
                            Delivered ✅
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentTab === 'history' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="card-glass rounded-xl overflow-hidden border-white/5">
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-white">Delivery History</h2>
                <p className="text-xs text-white/40">Review your past completed deliveries</p>
              </div>
              <History className="h-5 w-5 text-white/20" />
            </div>
            <div className="p-2">
              {assignments.filter(a => a.status === 'delivered').length === 0 ? (
                <p className="text-center text-white/20 py-20 italic">No delivery history yet</p>
              ) : (
                <div className="space-y-1">
                  {assignments.filter(a => a.status === 'delivered').map((a, i) => (
                    <div key={i} className="p-4 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{a.orders?.order_code}</p>
                            <p className="text-[10px] text-white/40">{(a.orders as any)?.cafes?.name} · {formatDateTime(a.delivered_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-white">+{a.orders?.delivery_fee} ETB</p>
                          <p className="text-[9px] text-white/30 uppercase font-black">Earned</p>
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

      {currentTab === 'alerts' && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="card-glass rounded-xl overflow-hidden border-white/5">
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-white">Notifications</h2>
                <p className="text-xs text-white/40">Stay updated on new requests and system alerts</p>
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
                          n.type === 'delivery_assignment' ? "bg-primary/10 text-primary" : "bg-white/10 text-white/40"
                        )}>
                          {n.type === 'delivery_assignment' ? <Truck className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-white flex items-center justify-between">
                            {n.title}
                            <span className="font-normal text-[9px] text-white/20">{formatDateTime(n.created_at)}</span>
                          </p>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed whitespace-pre-line">{n.message}</p>
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

export default DeliveryDashboard;
