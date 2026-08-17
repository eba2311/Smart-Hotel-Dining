import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Pause, Play } from 'lucide-react';
import { staffApi, adminApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Modal, Input, Select, Badge, Spinner, Empty } from '../../components/ui.jsx';

const ROLE_COLORS = {
  manager: 'bg-brand-100 text-brand-700',
  waiter: 'bg-sky-100 text-sky-700',
  kitchen: 'bg-violet-100 text-violet-700',
  admin: 'bg-slate-900 text-white',
};

export default function StaffPage() {
  const { branch, branches, setBranch } = useBranch();
  const toast = useToast();
  const [staff, setStaff] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter', phone: '' });
  const [allBranches, setAllBranches] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    staffApi.list(branch || undefined).then((res) => setStaff(res.data)).catch(() => setStaff([]));
  };

  useEffect(() => { load(); }, [branch]);

  useEffect(() => {
    adminApi.branches().then((res) => setAllBranches(res.data)).catch(() => {});
  }, []);

  const save = async () => {
    const isEditing = !!editing;
    try {
      setSaving(true);
      if (editing) {
        await staffApi.update(editing._id, { name: form.name, phone: form.phone, role: form.role, branch: form.branch || undefined, password: form.password || undefined });
      } else {
        await staffApi.create({ ...form, branch: form.branch || undefined, password: form.password });
      }
      setShowAdd(false);
      setEditing(null);
      setForm({ name: '', email: '', password: '', role: 'waiter', phone: '' });
      load();
      toast.success(isEditing ? 'Staff updated' : 'Staff created');
    } catch (e) { toast.error(e.message || 'Failed to save staff'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (!confirm(`${u.active ? 'Deactivate' : 'Activate'} ${u.name}?`)) return;
    try {
      await staffApi.update(u._id, { active: !u.active });
      load();
      toast.success(`${u.name} ${u.active ? 'deactivated' : 'activated'}`);
    } catch (e) { toast.error(e.message || 'Failed to update staff'); }
  };

  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    try {
      await staffApi.remove(u._id);
      load();
      toast.success(`${u.name} deleted`);
    } catch (e) { toast.error(e.message || 'Failed to delete staff'); }
  };

  if (!staff) return <DashboardLayout title="Staff"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Staff Management"
      actions={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'waiter', phone: '', branch }); setShowAdd(true); }}>
            <Plus size={16} /> Add Staff
          </Button>
        </>
      }
    >
      {staff.length === 0 ? (
        <Empty icon="👥" title="No staff yet" subtitle="Add waiters, kitchen staff and managers." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((u) => (
            <div key={u._id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-lg">{u.avatar || u.name?.[0]}</span>
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                    <p className="text-xs text-slate-400">{allBranches.find((b) => b._id === u.branch)?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <Badge className={ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}>{u.role}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">{u.active ? 'Active' : 'Deactivated'}</p>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', branch: u.branch }); setShowAdd(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(u)} className="p-2 rounded-lg hover:bg-amber-50 text-amber-500" title={u.active ? 'Deactivate' : 'Activate'}>
                    {u.active ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button onClick={() => remove(u)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editing ? `Edit ${editing.name}` : 'Add Staff'}>
        <div className="space-y-4">
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
          <Input label={editing ? 'New password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="waiter">Waiter</option>
            <option value="kitchen">Kitchen</option>
            <option value="manager">Manager</option>
          </Select>
          <Select label="Branch" value={form.branch || ''} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            <option value="">Unassigned</option>
            {allBranches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button className="w-full" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Create Staff'}</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
