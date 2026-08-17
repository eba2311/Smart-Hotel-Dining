import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Utensils, Star, Wifi, ArrowRight, ChevronRight } from 'lucide-react';

const features = [
  {
    icon: <QrCode size={28} />,
    title: 'Scan & Order',
    desc: 'Scan the QR code at your table to browse the full menu and order instantly.',
  },
  {
    icon: <Utensils size={28} />,
    title: 'Fresh & Fast',
    desc: 'Your order goes straight to the kitchen. Track preparation in real-time.',
  },
  {
    icon: <Star size={28} />,
    title: 'Rate & Feedback',
    desc: 'Share your experience with AI-powered sentiment analysis.',
  },
  {
    icon: <Wifi size={28} />,
    title: 'Room Service',
    desc: 'In-room dining and service requests at your fingertips.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [qrInput, setQrInput] = useState('');

  const handleQrSubmit = (e) => {
    e.preventDefault();
    const token = qrInput.trim();
    if (token) navigate(`/menu/${token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-brand-950 text-white overflow-hidden">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xl shadow-brand-glow">
            🏨
          </span>
          <div>
            <p className="font-bold leading-tight">Smart Hotel</p>
            <p className="text-xs text-brand-400">Dining & Service</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="btn-outline !border-white/20 !text-white hover:!bg-white/10"
        >
          Staff Login
        </button>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <p className="text-brand-400 font-semibold text-sm tracking-widest uppercase mb-4">
              Welcome to Smart Hotel
            </p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Dining{' '}
              <span className="text-gradient">Reimagined</span>
              <br />
              for the Modern Guest
            </h1>
            <p className="text-lg text-neutral-400 mb-8 max-w-lg">
              Scan a QR code, browse our curated menu, order with a tap, and track your meal — all from your phone.
            </p>

            <form onSubmit={handleQrSubmit} className="flex gap-3 max-w-md">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Enter QR code token..."
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-neutral-500"
              />
              <button
                type="submit"
                className="btn-primary !px-6"
              >
                Go <ArrowRight size={16} />
              </button>
            </form>

            <p className="text-xs text-neutral-500 mt-3">
              Scan the QR code on your table or room to get started
            </p>
          </div>

          <div className="relative hidden md:flex justify-center">
            <div className="relative">
              <div className="w-72 h-72 rounded-3xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 border border-brand-500/30 flex items-center justify-center shadow-brand-glow-lg animate-float-slow">
                <div className="text-center">
                  <div className="text-8xl mb-4">🍽️</div>
                  <p className="text-brand-300 font-semibold">Scan Me</p>
                  <div className="mt-3 w-40 h-40 mx-auto rounded-xl bg-white p-2">
                    <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                      <QrCode size={48} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl animate-float-slow" style={{ animationDelay: '2s' }}>
                ⭐
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl animate-float-slow" style={{ animationDelay: '4s' }}>
                🔥
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-brand-400 font-semibold text-sm tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-black">
              Simple as <span className="text-gradient">1-2-3</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="card !bg-white/5 !border-white/10 p-6 text-center group hover:!border-brand-500/40 hover:!bg-brand-500/5 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white mx-auto mb-4 shadow-brand-glow group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to <span className="text-gradient">Order</span>?
          </h2>
          <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
            Scan the QR code on your table or enter your room number to start browsing our menu.
          </p>
          <form onSubmit={handleQrSubmit} className="flex gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Enter QR code token..."
              className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-neutral-500"
            />
            <button type="submit" className="btn-primary !px-6">
              Start <ChevronRight size={16} />
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏨</span>
            <span>Smart Hotel Dining & Service</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Grand Palace Hotel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
