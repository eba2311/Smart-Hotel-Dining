import React, { useEffect, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { Spinner, Empty, Badge } from '../../components/ui.jsx';
import { fmtDateTime } from '../../lib/format.js';

const PAGE_SIZE = 20;

const METHOD_COLORS = {
  GET: 'bg-sky-100 text-sky-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    adminApi.auditLogs()
      .then((res) => setLogs(res.data))
      .catch(() => setLogs([]));
  }, []);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (l.user?.name || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q) || (l.target || '').toLowerCase().includes(q) || (l.path || '').toLowerCase().includes(q) || (l.ip || '').toLowerCase().includes(q);
      const matchMethod = !methodFilter || l.method === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [logs, search, methodFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, methodFilter]);

  if (!logs) return <DashboardLayout title="Audit Logs"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout title="Audit Logs">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                methodFilter === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m || 'All'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="🕵️" title="No activity recorded" subtitle={search || methodFilter ? 'Try a different filter.' : undefined} />
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">{filtered.length} entries</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((l) => (
                  <tr key={l._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td className="px-4 py-2 font-medium">{l.user?.name || '—'}</td>
                    <td className="px-4 py-2"><Badge className="bg-slate-100 text-slate-600">{l.role || '—'}</Badge></td>
                    <td className="px-4 py-2 font-medium">{l.action}</td>
                    <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate">{l.target || '—'}</td>
                    <td className="px-4 py-2"><Badge className={METHOD_COLORS[l.method] || 'bg-slate-100 text-slate-600'}>{l.method}</Badge></td>
                    <td className="px-4 py-2 text-slate-400 text-xs max-w-[160px] truncate">{l.path}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
