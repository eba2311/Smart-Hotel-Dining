import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Utensils, Table2, Package, Users, MessageSquare,
  BarChart3, LogOut, ClipboardList, Building2, ScrollText, Home,
  Ticket, UserCircle, BarChart2, WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';

const managerNav = [
  { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/manager/orders', label: 'Orders', icon: ClipboardList },
  { to: '/manager/menu', label: 'Menu', icon: Utensils },
  { to: '/manager/tables', label: 'Tables & Rooms', icon: Table2 },
  { to: '/manager/inventory', label: 'Inventory', icon: Package },
  { to: '/manager/coupons', label: 'Coupons', icon: Ticket },
  { to: '/manager/staff', label: 'Staff', icon: Users },
  { to: '/manager/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/manager/analytics', label: 'AI Analytics', icon: BarChart3 },
];

const adminNav = [
  { to: '/admin', label: 'Organization', icon: Building2, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
];

export default function DashboardLayout({ title, children, actions }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const nav = user?.role === 'admin' ? adminNav : managerNav;

  const branchLabel = user?.branch ? '' : '';

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gradient-to-b from-black via-neutral-950 to-brand-950 text-neutral-400 flex flex-col shrink-0 hidden md:flex border-r border-neutral-800">
        <div className="px-5 py-6 border-b border-neutral-800">
          <div className="flex items-center gap-3 text-white">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xl shadow-brand-glow">
              🏨
            </span>
            <div>
              <p className="font-bold leading-tight">Smart Hotel</p>
              <p className="text-xs text-brand-400">Dining &amp; Service</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                    : 'hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 ring-2 ring-brand-500/30 flex items-center justify-center text-white text-sm font-bold shadow-brand-glow">
              {user?.name?.[0] || 'U'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize">{user?.role}{branchLabel}</p>
            </div>
          </div>
          <button
            onClick={() => { navigate('/profile'); }}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-brand-400 hover:bg-brand-500/10 w-full px-2 py-1.5 rounded-lg transition-colors"
          >
            <UserCircle size={16} /> Profile
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-brand-400 hover:bg-brand-500/10 w-full px-2 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl md:hidden">🏨</span>
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {connected === false && (
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                <WifiOff size={13} /> Offline
              </span>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-lg hover:bg-slate-100 md:hidden" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="md:hidden flex gap-2 mb-5 overflow-x-auto pb-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={nav.every((n) => n.to !== to) ? false : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-semibold',
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                      : 'bg-white border border-slate-200 text-slate-600'
                  )
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
