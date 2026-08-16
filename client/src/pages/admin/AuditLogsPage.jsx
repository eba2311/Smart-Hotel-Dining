import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { Spinner, Empty, Badge } from '../../components/ui.jsx';
import { fmtDateTime } from '../../lib/format.js';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    adminApi.auditLogs().then((res) => setLogs(res.data)).catch(() => setLogs([]));
  }, []);

  if (!logs) return <DashboardLayout title="Audit Logs"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout title="Audit Logs">
      {logs.length === 0 ? (
        <Empty icon="🕵️" title="No activity recorded" />
      ) : (
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
              {logs.map((l) => (
                <tr key={l._id} className="border-b border-slate-50">
                  <td className="px-4 py-2 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-4 py-2 font-medium">{l.user?.name || '—'}</td>
                  <td className="px-4 py-2"><Badge className="bg-slate-100 text-slate-600">{l.role || '—'}</Badge></td>
                  <td className="px-4 py-2">{l.action}</td>
                  <td className="px-4 py-2 text-slate-500">{l.target || '—'}</td>
                  <td className="px-4 py-2 text-slate-400">{l.method}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{l.path}</td>
                  <td className="px-4 py-2 text-slate-400">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
