import React, { useState } from 'react';
import { User, Mail, Shield, Phone, Lock, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../lib/api.js';
import { Button, Input } from '../components/ui.jsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const roleColors = {
    admin: 'bg-rose-100 text-rose-700',
    manager: 'bg-brand-100 text-brand-700',
    waiter: 'bg-emerald-100 text-emerald-700',
    kitchen: 'bg-amber-100 text-amber-700',
    guest: 'bg-sky-100 text-sky-700',
  };

  const roleHome = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'manager') return '/manager';
    if (role === 'kitchen') return '/kitchen';
    if (role === 'waiter') return '/waiter';
    return '/';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await authApi.updateProfile({ name: form.name, phone: form.phone });
      updateUser(res.data);
      localStorage.setItem('sh_user', JSON.stringify(res.data));
      setMsg('Profile updated successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMsg('Passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      setMsg('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const res = await authApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      if (res.token) localStorage.setItem('sh_token', res.token);
      setMsg('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <div className="bg-gradient-to-r from-black via-neutral-950 to-brand-950 text-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(roleHome(user?.role))}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 ring-4 ring-brand-500/30 flex items-center justify-center text-white text-2xl font-bold shadow-brand-glow">
              {user?.name?.[0] || 'U'}
            </span>
            <div>
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${roleColors[user?.role] || 'bg-slate-100 text-slate-600'} capitalize`}>
                  <Shield size={12} /> {user?.role}
                </span>
                <span className="text-sm text-neutral-400">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
            msg.includes('success') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {msg}
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <User size={18} className="text-brand-600" /> Profile Information
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                icon={<User size={16} className="text-slate-400" />}
              />
              <Input
                label="Email"
                value={form.email}
                disabled
                icon={<Mail size={16} className="text-slate-400" />}
                className="!bg-slate-50"
              />
            </div>
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+251 ..."
              icon={<Phone size={16} className="text-slate-400" />}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                <Save size={16} /> Save Changes
              </Button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Lock size={18} className="text-brand-600" /> Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
              <Input
                label="Confirm Password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
            <p className="text-xs text-slate-400">Password must be at least 8 characters</p>
            <div className="flex justify-end">
              <Button type="submit" variant="outline">
                <Lock size={16} /> Change Password
              </Button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4">Account Details</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Role</p>
              <p className="font-semibold capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="font-semibold text-emerald-600">Active</p>
            </div>
            <div>
              <p className="text-slate-400">Member Since</p>
              <p className="font-semibold">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Branch</p>
              <p className="font-semibold">{user?.branch?.name || 'All Branches'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
