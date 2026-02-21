import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Utensils, Truck, Shield, Star } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Dorm2Door</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto py-24 text-center">
        <div className="animate-fade-in max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            🎓 Built for Campus Life
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
            Campus Food,
            <br />
            <span className="text-primary">Delivered Fast.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Skip the lines. Order from any campus cafe, track in real-time, and get your food delivered right to your dorm.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8">Order Now</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base px-8">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Clock, title: 'Save Time', desc: 'No more waiting in long lines. Order ahead and pick up or get delivery.' },
            { icon: MapPin, title: '10+ Campus Cafes', desc: 'Browse menus from every cafe on campus in one place.' },
            { icon: Truck, title: 'Dorm Delivery', desc: 'Get food delivered to your dorm by fellow student workers.' },
            { icon: Shield, title: 'Secure Payments', desc: 'Pay via bank transfer, Telebirr, or cash on pickup.' },
            { icon: Star, title: 'Rate & Review', desc: 'Help the community by rating cafes and delivery workers.' },
            { icon: Utensils, title: 'Real-Time Tracking', desc: 'Track your order from preparation to delivery.' },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Dorm2Door. Built for students, by students.</p>
      </footer>
    </div>
  );
};

export default Landing;
