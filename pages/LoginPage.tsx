
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, devLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
        await login(email, password);
        // On success: keep button in "Signing in..." state.
        // onAuthStateChange will fire SIGNED_IN and redirect via React Router.
        // Do NOT call setIsSubmitting(false) here — it causes a button flicker.
    } catch (err: any) {
        console.error(err);
        if (err?.message?.includes('Invalid login credentials')) {
            setError("Invalid email or password. Please check your credentials.");
        } else if (err?.message?.includes('Email not confirmed')) {
            setError("Email not confirmed. Contact admin to confirm your email.");
        } else {
            setError(err?.message || "Authentication failed. Please try again.");
        }
        // Only reset on error so the user can try again.
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
            <h1 className="text-5xl font-black text-primary tracking-tighter">
                <span className="text-accent">Alt</span>Leads
            </h1>
            <p className="text-text-secondary font-medium tracking-wide uppercase text-xs mt-2">Prospect Intelligence System</p>
        </div>
        <Card className="border-t-4 border-accent shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-text-primary">
                Authorized Login
            </h2>
            <Input
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@altleads.com"
              required
            />
            <div>
              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            
            <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-gray-900" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <div className="pt-4 border-t border-gray-100">
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-xs text-gray-400 hover:text-accent" 
                    onClick={devLogin}
                >
                    Developer Bypass
                </Button>
            </div>
          </form>
          <div className="mt-6 text-center text-[10px] text-text-secondary uppercase tracking-widest leading-relaxed">
             Proprietary & Confidential <br/>
             © {new Date().getFullYear()} AltLeads. All Rights Reserved.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;