import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import { analyticsApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Select, Spinner, Badge } from '../../components/ui.jsx';
import { fmtMoney } from '../../lib/format.js';

const LEVEL_COLORS = { HIGH: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-rose-100 text-rose-700' };

export default function AnalyticsPage() {
  const { branch, branches, setBranch } = useBranch();
  const [revenue, setRevenue] = useState(null);
  const [satisfaction, setSatisfaction] = useState(null);
  const [demand, setDemand] = useState(null);
  const [days, setDays] = useState(14);

  useEffect(() => {
    if (!branch) return;
    setRevenue(null); setSatisfaction(null); setDemand(null);
    analyticsApi.revenue(branch, days).then((res) => setRevenue(res.data));
    analyticsApi.satisfaction(branch).then((res) => setSatisfaction(res.data));
    analyticsApi.demand(branch).then((res) => setDemand(res.data));
  }, [branch, days]);

  const aspectData = satisfaction
    ? Object.entries(satisfaction.aspectScores)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ aspect: k.replace('foodQuality', 'Food Quality').replace('service', 'Service').replace('speed', 'Speed').replace('price', 'Value').replace('menu', 'Menu'), score: v }))
    : [];

  return (
    <DashboardLayout
      title="AI Analytics"
      actions={
        <div className="flex gap-2">
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Select value={days} onChange={(e) => setDays(e.target.value)} className="w-28">
            {[7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
          </Select>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="font-bold mb-4">Revenue Trend</p>
          {revenue ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue.map((r) => ({ name: r._id, revenue: r.total }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#1d63f5" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Spinner />}
        </div>

        <div className="card p-5">
          <p className="font-bold mb-4">Customer Satisfaction by Aspect</p>
          {aspectData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={aspectData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="aspect" tick={{ fontSize: 11 }} />
                <Radar dataKey="score" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Spinner />}
        </div>

        <div className="card p-5 lg:col-span-2">
          <p className="font-bold mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600" /> AI Demand Prediction
            {demand && <span className="text-xs font-normal text-slate-400">— {demand.dow}, {demand.forecastFor}</span>}
          </p>
          {demand ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-2">Dish</th>
                    <th className="px-4 py-2">Expected demand</th>
                    <th className="px-4 py-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.items.map((it) => (
                    <tr key={it.itemId || it.name} className="border-b border-slate-50">
                      <td className="px-4 py-2 font-medium">{it.name}</td>
                      <td className="px-4 py-2">
                        <div className="w-40 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={it.level === 'HIGH' ? 'h-full bg-emerald-500' : it.level === 'MEDIUM' ? 'h-full bg-amber-500' : 'h-full bg-rose-400'} style={{ width: `${Math.min(100, it.expected * 20)}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{it.expected} units</span>
                      </td>
                      <td className="px-4 py-2"><Badge className={LEVEL_COLORS[it.level]}>{it.level}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {demand.note && <p className="text-xs text-slate-400 mt-3">{demand.note}</p>}
            </div>
          ) : <Spinner />}
        </div>

        <div className="card p-5 lg:col-span-2">
          <p className="font-bold mb-4">Satisfaction Distribution</p>
          {satisfaction ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(satisfaction.distribution).map(([k, v]) => ({ name: k, count: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d63f5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Spinner />}
        </div>
      </div>
    </DashboardLayout>
  );
}
