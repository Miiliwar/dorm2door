import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/PageLayout';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.user) {
      toast.error('Account created but failed to sign in. Please sign in manually.');
      setLoading(false);
      navigate('/login');
      return;
    }

    const roleMap: Record<string, string> = {
      student: 'student',
      delivery_worker: 'delivery_worker',
    };

    const mappedRole = roleMap[role];
    if (mappedRole) {
      await supabase.from('user_roles').insert({ user_id: signInData.user.id, role: mappedRole as any });

      if (role === 'delivery_worker') {
        await supabase.from('delivery_workers').insert({ user_id: signInData.user.id });
      }
    }

    setLoading(false);
    toast.success('Account created successfully!');
    navigate('/dashboard');
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
              <CardTitle className="text-2xl font-display font-bold text-white">Create Account</CardTitle>
              <CardDescription className="text-white/60">Join Dorm2Door to start ordering</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-white/80">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-primary/50 transition-colors"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">I am a...</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="student" className="focus:bg-primary/20 focus:text-primary transition-colors">Student</SelectItem>
                      <SelectItem value="delivery_worker" className="focus:bg-primary/20 focus:text-primary transition-colors">Delivery Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 shadow-lg shadow-primary/20 text-base font-semibold mt-4" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
              <p className="text-sm text-center text-white/40 mt-6">
                Already have an account? <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign In</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Signup;
