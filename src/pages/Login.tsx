import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Dorm2Door</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <p className="text-sm text-center text-muted-foreground mt-4">
              Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign Up</Link>
            </p>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display">Demo Accounts</CardTitle>
            <CardDescription className="text-xs">Click to auto-fill credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEMO_ACCOUNTS.map(a => (
              <button key={a.role} onClick={() => fillDemo(a)} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{a.role}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.role}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.email} / {a.password}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
