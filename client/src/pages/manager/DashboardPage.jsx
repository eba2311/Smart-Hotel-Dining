import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote, ClipboardList, Star, PackageX, TrendingUp, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from 'recharts';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { StatCard, Spinner, Empty, Select, ProgressBar } from '../../components/ui.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { analyticsApi } from '../../lib/api.js';
import { fmtMoney } from '../../lib/format.js';
import DishImage from '../../components/DishImage.jsx';

export default function DashboardPage() {
  const { branch, branches, setBranch } = useBranch();
  const { on } = useSocket();
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = () => {
    if (branch) analyticsApi.summary(branch).then((res) => { setData(res.data); setLastUpdated(Date.now()); }).catch(() => {});
  };

  useEffect(() => {
    if (!branch) return;
    analyticsApi.summary(branch).then((res) => { setData(res.data); setLastUpdated(Date.now()); }).catch(() => setData(null));
  }, [branch]);

  useEffect(() => {
    if (!on) return;
    const offNew = on('order:new', refresh);
    const offStatus = on('order:status', refresh);
    return () => { offNew(); offStatus(); };
  }, [on, branch]);

  useEffect(() => {
    if (!branch) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [branch]);

  const statusTotals = (statusMap) => {
    const keys = ['CREATED', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
    return keys.filter((k) => (statusMap[k] || 0) > 0).map((k) => ({ name: k, count: statusMap[k] }));
  };

  return (
    <DashboardLayout
      title="Manager Dashboard"
      actions={
        <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-52">
          <option value="">Select branch...</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </Select>
      }
    >
      {!data ? (
        <Spinner label="Loading dashboard..." />
      ) : (
        <div className="space-y-6">
          {lastUpdated && <p className="text-xs text-slate-400">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Banknote size={22} />} label="Today's Sales" value={fmtMoney(data.todaySales)} sub={`Last 7 days: ${fmtMoney(data.last7Sales)}`} color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={<ClipboardList size={22} />} label="Orders Today" value={data.todayOrders} sub={`Active: ${data.activeOrders}`} color="bg-sky-50 text-sky-600" />
            <StatCard icon={<Star size={22} />} label="Avg Rating" value={data.satisfaction.avg ? `${data.satisfaction.avg.toFixed(1)} / 5` : '—'} sub={`${data.satisfaction.count} reviews`} color="bg-amber-50 text-amber-600" />
            <StatCard icon={<PackageX size={22} />} label="Out of Stock" value={data.lowStock.length} sub="ingredients need restock" color="bg-rose-50 text-rose-600" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="card p-5 lg:col-span-2">
              <p className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} /> Revenue (last 7 days)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.revenueByDay.map((d) => ({ name: d._id, revenue: d.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#1d63f5" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="font-bold mb-4">Orders by Status</p>
              {statusTotals(data.ordersByStatus).length === 0 ? (
                <Empty title="No orders" />
              ) : (
                <div className="space-y-2.5">
                  {statusTotals(data.ordersByStatus).map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-slate-600">{s.name.replace(/_/g, ' ').toLowerCase()}</span>
                        <span className="font-semibold">{s.count}</span>
                      </div>
                      <ProgressBar value={(s.count / Math.max(1, Math.max(...statusTotals(data.ordersByStatus).map((x) => x.count)))) * 100} color={s.name === 'CANCELLED' ? 'bg-rose-500' : 'bg-brand-600'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="card p-5">
              <p className="font-bold mb-4">Popular Items (7 days)</p>
              {data.popularItems.length === 0 ? (
                <Empty title="No data" />
              ) : (
                <div className="space-y-3">
                  {data.popularItems.map((p, i) => (
                    <div key={p._id} className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-slate-400">{i + 1}</span>
                      <DishImage src={p.image} alt={p._id} size="w-12 h-12" textSize="text-2xl" />
                      <span className="flex-1 text-sm font-medium">{p._id}</span>
                      <span className="text-sm font-bold text-brand-700">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <p className="font-bold mb-4">Peak Hours (30 days)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.peakHours.map((h) => ({ name: `${h._id}:00`, orders: h.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="font-bold mb-4 flex items-center gap-2 text-rose-600"><Sparkles size={16} /> Low Stock Alerts</p>
              {data.lowStock.length === 0 ? (
                <Empty icon="✅" title="All good" subtitle="No ingredients are out of stock." />
              ) : (
                <div className="space-y-3">
                  {data.lowStock.slice(0, 8).map((i) => (
                    <div key={i._id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{i.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1"><ProgressBar value={(i.stock / Math.max(1, i.lowStockThreshold)) * 30} color="bg-rose-500" /></div>
                          <span className="text-xs text-rose-600 font-semibold">{i.stock} left</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link to="/manager/inventory" className="btn-outline w-full text-sm">Manage inventory</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
