import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Utensils, Truck, Shield, Star } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const Landing = () => {
  return (
    <PageLayout backgroundImage="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070">
      {/* Nav */}
      <nav className="bg-black/20 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-3 px-4 md:py-4 md:px-6">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Utensils className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <span className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">Dorm2Door</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 text-sm md:text-base px-3 md:px-6">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="shadow-xl shadow-primary/20 text-sm md:text-base font-bold rounded-full px-4 md:px-8 h-9 md:h-12">Join Now</Button>
            </Link>
          </div>
        </div>
      </nav>


      <main className="flex-grow">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 md:py-32 text-center">
          <div className="animate-fade-in max-w-4xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-8 backdrop-blur-sm border border-primary/20">
              🎓 Need something delivered ASAP? Dorm2Door is Yours For faster service.
            </span>
            <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tight mb-8 leading-[1.1]">
              Your Hunger,
              <br />
              <span className="text-primary drop-shadow-sm">Our Urgency.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed italic">
              "Fresh food, fast delivery. We Deliver More Than Food."
              <br />
              <span className="not-italic text-sm md:text-base mt-4 block text-white/60">Skip the lines. Order from any campus cafe, track in real-time, and get your food delivered right to your dorm.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base px-10 h-14 rounded-full shadow-xl shadow-primary/30">Order Now</Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-10 h-14 rounded-full bg-white/5 border-white/20 hover:bg-white/10 text-white backdrop-blur-md">
                  Explore Menus
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-24 border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Clock, title: 'Save Time', desc: 'No more waiting in long lines. Order ahead and pick up or get delivery.' },
              { icon: MapPin, title: '10+ Campus Cafes', desc: 'Browse menus from every cafe on campus in one place.' },
              { icon: Truck, title: 'Dorm Delivery', desc: 'Get food delivered to your dorm by fellow student workers.' },
              { icon: Shield, title: 'Secure Payments', desc: 'Pay via bank transfer, Telebirr, or cash on pickup.' },
              { icon: Star, title: 'Rate & Review', desc: 'Help the community by rating cafes and delivery workers.' },
              { icon: Utensils, title: 'Real-Time Tracking', desc: 'Track your order from preparation to delivery.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl mb-3 text-white">{f.title}</h3>
                <p className="text-white/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/40 backdrop-blur-md px-4 mt-auto">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Utensils className="h-6 w-6 text-primary" />
            <span className="text-xl font-display font-bold text-white">Dorm2Door</span>
          </div>
          <p className="text-white/40">© 2026 Dorm2Door. Built for students, by students.</p>
        </div>
      </footer>
    </PageLayout>
  );
};

export default Landing;
