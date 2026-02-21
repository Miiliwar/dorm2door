import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/PageLayout';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@dorm2door.com', password: 'Admin@123' },
  { role: 'Cafe Manager', email: 'manager@dorm2door.com', password: 'Manager@123' },
  { role: 'Student', email: 'student@dorm2door.com', password: 'Student@123' },
  { role: 'Delivery Worker', email: 'delivery@dorm2door.com', password: 'Delivery@123' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const fillDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <PageLayout backgroundImage="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=2070">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in py-12">
          <div className="text-center relative">
            <Link to="/" className="absolute -left-2 top-2 p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/" className="inline-flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                <Utensils className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-display font-bold text-white tracking-tight">Dorm2Door</span>
            </Link>
          </div>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden">
            <CardHeader className="space-y-1 pb-6 px-8 pt-8">
              <CardTitle className="text-2xl font-display font-bold text-white">Welcome Back</CardTitle>
              <CardDescription className="text-white/60">Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-primary/50 transition-colors"
                      required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 shadow-lg shadow-primary/20 text-base font-semibold" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              <p className="text-sm text-center text-white/40 mt-6">
                Don't have an account? <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign Up</Link>
              </p>
            </CardContent>
          </Card>

          {/* Demo Accounts */}
          <Card className="bg-black/20 backdrop-blur-md border border-white/5 border-dashed overflow-hidden">
            <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-display font-bold text-white/80 uppercase tracking-wider">Demo Access</CardTitle>
                <CardDescription className="text-[10px] text-white/40">Quick-start demo accounts</CardDescription>
              </div>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">DEVELOPER TOOLS</span>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(a => (
                  <button
                    key={a.role}
                    onClick={() => fillDemo(a)}
                    className="group text-left p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[11px] text-white/90 group-hover:text-primary transition-colors">{a.role}</span>
                    </div>
                    <div className="text-[10px] text-white/40 truncate">
                      {a.email}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Login;
