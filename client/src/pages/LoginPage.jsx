import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader2, UserCog, ChefHat, BellRing, ShieldCheck,
} from 'lucide-react';

const ROLE_HOME = { admin: '/admin', manager: '/manager', waiter: '/waiter', kitchen: '/kitchen' };

const DEMO = [
  { label: 'Manager', icon: UserCog, email: 'manager@hotel.com', password: 'Manager@123' },
  { label: 'Kitchen', icon: ChefHat, email: 'kitchen@hotel.com', password: 'Kitchen@123' },
  { label: 'Waiter', icon: BellRing, email: 'waiter@hotel.com', password: 'Waiter@123' },
  { label: 'Admin', icon: ShieldCheck, email: 'admin@hotel.com', password: 'Admin@123' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sh_remember_email');
    if (saved) setEmail(saved);
  }, []);

  const goHome = (user) => navigate(ROLE_HOME[user.role] || '/login', { replace: true });

  const doLogin = async (em, pw) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(em, pw);
      if (remember) localStorage.setItem('sh_remember_email', em);
      else localStorage.removeItem('sh_remember_email');
      goHome(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length) return;
    await doLogin(email.trim(), password);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-950 via-black to-brand-950 p-4">
      {/* Colorful ambient orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-brand-600/30 blur-3xl animate-float-slow" />
      <div
        className="pointer-events-none absolute -bottom-36 -left-36 w-[26rem] h-[26rem] rounded-full bg-accent-500/20 blur-3xl animate-float-slow"
        style={{ animationDelay: '-4s' }}
      />
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl animate-float-slow"
        style={{ animationDelay: '-8s' }}
      />
      <div className="pointer-events-none absolute top-10 left-10 w-56 h-56 rounded-full bg-brand-400/20 blur-3xl animate-float-slow" />

      <div className="w-full max-w-md animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 via-accent-400 to-brand-700 text-white text-3xl shadow-brand-glow-lg">
            🏨
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-accent-300 to-brand-500">
            Smart Hotel Dining
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Ordering &amp; Service Management System</p>
        </div>

        {/* Card */}
        <div className="relative glass-dark rounded-3xl p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-accent-400 to-brand-600" />

          <h2 className="text-lg font-bold tracking-tight text-white">Welcome back</h2>
          <p className="text-neutral-400 text-sm mt-1 mb-6">Sign in to your staff account</p>

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
                  placeholder="Email address"
                  className={`w-full rounded-xl border bg-neutral-800/70 pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-neutral-500 focus:ring-4 ${errors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-neutral-700 focus:border-brand-500 focus:ring-brand-500/20'}`}
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 mt-1.5">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: '' }); }}
                  placeholder="Password"
                  className={`w-full rounded-xl border bg-neutral-800/70 pl-10 pr-11 py-2.5 text-sm text-white outline-none transition-all placeholder:text-neutral-500 focus:ring-4 ${errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-neutral-700 focus:border-brand-500 focus:ring-brand-500/20'}`}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  title={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-400 mt-1.5">{errors.password}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-neutral-400">Remember me</span>
            </label>

            {error && (
              <p className="text-sm text-rose-300 bg-brand-500/10 border border-brand-500/40 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 text-white font-bold py-2.5 text-sm hover:from-brand-400 hover:via-brand-500 hover:to-brand-600 active:scale-[0.99] transition-all shadow-brand-glow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-500 mb-3">Demo accounts — one click signs you in</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map(({ label, icon: Icon, email: em, password: pw }) => (
                <button
                  key={label}
                  type="button"
                  disabled={loading}
                  onClick={() => doLogin(em, pw)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-neutral-800/70 border border-neutral-700 text-left hover:border-brand-500 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/30 to-brand-700/30 text-brand-300 flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </span>
                  <span className="text-sm font-medium text-neutral-200">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-neutral-600 text-xs mt-6">© 2026 Smart Hotel Dining</p>
      </div>
    </div>
  );
}
