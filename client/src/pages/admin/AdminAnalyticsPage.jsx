import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { Building2, TrendingUp, Users, ShoppingBag, Star } from 'lucide-react';
import { adminApi, analyticsApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { StatCard, Spinner, Badge } from '../../components/ui.jsx';
import { fmtMoney } from '../../lib/format.js';

export default function AdminAnalyticsPage() {
  const [hotels, setHotels] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [branches, setBranches] = useState([]);
  const [branchData, setBranchData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.hotels().then((res) => {
      setHotels(res.data);
      if (res.data.length > 0) setSelectedHotel(res.data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedHotel) return;
    setLoading(true);
    adminApi.branches(selectedHotel).then((res) => {
      setBranches(res.data);
      const promises = res.data.map((b) =>
        analyticsApi.summary(b._id).then((r) => ({ branchId: b._id, branchName: b.name, ...r.data })).catch(() => null)
      );
      Promise.all(promises).then((results) => {
        const map = {};
        results.filter(Boolean).forEach((r) => { map[r.branchId] = r; });
        setBranchData(map);
        setLoading(false);
      });
    });
  }, [selectedHotel]);

  const totalRevenue = Object.values(branchData).reduce((sum, d) => sum + (d.todaySales || 0), 0);
  const totalOrders = Object.values(branchData).reduce((sum, d) => sum + (d.todayOrders || 0), 0);
  const branchesWithRating = Object.values(branchData).filter((d) => d.satisfaction?.avg > 0);
  const overallRating = branchesWithRating.length > 0
    ? (branchesWithRating.reduce((sum, d) => sum + d.satisfaction.avg, 0) / branchesWithRating.length).toFixed(1)
    : '—';
  const totalOutOfStock = Object.values(branchData).reduce((sum, d) => sum + (d.lowStock?.length || 0), 0);

  return (
    <DashboardLayout
      title="Cross-Branch Analytics"
      actions={
        <select
          value={selectedHotel}
          onChange={(e) => setSelectedHotel(e.target.value)}
          className="input !w-56"
        >
          {(hotels || []).map((h) => (
            <option key={h._id} value={h._id}>{h.name}</option>
          ))}
        </select>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Total Sales (Today)"
              value={fmtMoney(totalRevenue)}
              sub={`Across ${branches.length} branch${branches.length !== 1 ? 'es' : ''}`}
              color="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={<ShoppingBag size={20} />}
              label="Orders Today"
              value={totalOrders}
              sub="All branches combined"
              color="bg-sky-50 text-sky-700"
            />
            <StatCard
              icon={<Star size={20} />}
              label="Avg. Rating"
              value={overallRating}
              sub={avgRating.length > 0 ? `From ${avgRating.length} branches` : 'No ratings yet'}
              color="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={<Users size={20} />}
              label="Low Stock Items"
              value={totalOutOfStock}
              sub={totalOutOfStock > 0 ? 'Needs attention' : 'All stocked'}
              color={totalOutOfStock > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <p className="font-bold mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-brand-600" /> Sales by Branch
              </p>
              {branches.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={branches.map((b) => ({
                      name: b.name,
                      sales: branchData[b._id]?.todaySales || 0,
                      orders: branchData[b._id]?.todayOrders || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => name === 'sales' ? fmtMoney(v) : v} />
                    <Bar dataKey="sales" fill="#1d63f5" radius={[4, 4, 0, 0]} name="Sales" />
                    <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No branches found for this hotel</p>
              )}
            </div>

            <div className="card p-5">
              <p className="font-bold mb-4">Branch Performance</p>
              <div className="space-y-3">
                {branches.map((b) => {
                  const d = branchData[b._id];
                  if (!d) return null;
                  const pct = totalRevenue > 0 ? Math.round(((d.todaySales || 0) / totalRevenue) * 100) : 0;
                  return (
                    <div key={b._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold">
                        {b.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold truncate">{b.name}</p>
                          <p className="text-xs text-slate-500">{fmtMoney(d.todaySales || 0)}</p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">{d.todayOrders || 0}</p>
                        <p className="text-[10px] text-slate-400">orders</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="font-bold mb-4">All Branches Overview</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Today's Sales</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">Avg Rating</th>
                    <th className="px-4 py-3">Low Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => {
                    const d = branchData[b._id];
                    return (
                      <tr key={b._id} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium">{b.name}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-slate-100 text-slate-600 capitalize">{b.type?.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold">{d ? fmtMoney(d.todaySales || 0) : '—'}</td>
                        <td className="px-4 py-3">{d?.todayOrders || 0}</td>
                        <td className="px-4 py-3">
                          {d?.satisfaction?.avg > 0 ? (
                            <span className="flex items-center gap-1">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              {d.satisfaction.avg.toFixed(1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {d?.lowStock?.length > 0 ? (
                            <Badge className="bg-rose-100 text-rose-700">{d.lowStock.length} items</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
