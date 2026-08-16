import React, { useEffect, useState } from 'react';
import { adminApi, staffApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { Spinner, Empty, Badge, Button, Modal, Input, Select } from '../../components/ui.jsx';
import { fmtDateTime } from '../../lib/format.js';

const ROLE_COLORS = {
  admin: 'bg-slate-900 text-white',
  manager: 'bg-brand-100 text-brand-700',
  waiter: 'bg-sky-100 text-sky-700',
  kitchen: 'bg-violet-100 text-violet-700',
  guest: 'bg-slate-100 text-slate-600',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guest', phone: '' });

  const load = () => {
    adminApi.users().then((res) => setUsers(res.data)).catch(() => setUsers([]));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) {
        await staffApi.update(editing._id, { name: form.name, phone: form.phone, role: form.role, password: form.password || undefined });
      } else {
        await staffApi.create(form);
      }
      setEditing(null);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'guest', phone: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const toggleActive = async (u) => {
    await staffApi.update(u._id, { active: !u.active });
    load();
  };

  if (!users) return <DashboardLayout title="Users"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="User Management"
      actions={<Button onClick={() => { setEditing(null); setShowModal(true); setForm({ name: '', email: '', password: '', role: 'guest', phone: '' }); }}>New User</Button>}
    >
      {users.length === 0 ? (
        <Empty title="No users" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3"><Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge className={u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>{u.active ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmtDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" className="!py-1 text-xs" onClick={() => { setEditing(u); setShowModal(true); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' }); }}>Edit</Button>
                      <Button variant="outline" className="!py-1 text-xs" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setEditing(null); setShowModal(false); setForm({ name: '', email: '', password: '', role: 'guest', phone: '' }); }} title={editing ? 'Edit User' : 'New User'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
          <Input label={editing ? 'New password (optional)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="guest">Guest</option>
            <option value="waiter">Waiter</option>
            <option value="kitchen">Kitchen</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button className="w-full" onClick={save}>{editing ? 'Save' : 'Create User'}</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
