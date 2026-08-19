import React, { useEffect, useState } from 'react';
import { Plus, MapPin, Trash2, Pencil } from 'lucide-react';
import { adminApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { Button, Modal, Input, Select, Spinner, Empty, Badge } from '../../components/ui.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminHomePage() {
  const toast = useToast();
  const [hotels, setHotels] = useState(null);
  const [branches, setBranches] = useState(null);
  const [showHotel, setShowHotel] = useState(false);
  const [showBranch, setShowBranch] = useState(false);
  const [editHotel, setEditHotel] = useState(null);
  const [editBranch, setEditBranch] = useState(null);
  const [hotelForm, setHotelForm] = useState({ name: '', address: '', phone: '', email: '', logo: '🏨' });
  const [branchForm, setBranchForm] = useState({ hotel: '', name: '', type: 'restaurant', address: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminApi.hotels().then((res) => setHotels(res.data)).catch(() => { setHotels([]); toast.error('Failed to load'); });
    adminApi.branches().then((res) => setBranches(res.data)).catch(() => { setBranches([]); toast.error('Failed to load'); });
  };

  useEffect(() => { load(); }, []);

  const saveHotel = async () => {
    setSaving(true);
    try {
      await adminApi.createHotel(hotelForm);
      toast.success('Hotel created');
      setShowHotel(false);
      setHotelForm({ name: '', address: '', phone: '', email: '', logo: '🏨' });
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to create hotel');
    } finally {
      setSaving(false);
    }
  };

  const saveBranch = async () => {
    setSaving(true);
    try {
      await adminApi.createBranch(branchForm);
      toast.success('Branch created');
      setShowBranch(false);
      setBranchForm({ hotel: '', name: '', type: 'restaurant', address: '', phone: '' });
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to create branch');
    } finally {
      setSaving(false);
    }
  };

  const removeHotel = async (h) => {
    if (!confirm(`Delete hotel "${h.name}"?`)) return;
    try {
      await adminApi.deleteHotel(h._id);
      toast.success('Hotel deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const removeBranch = async (b) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    try {
      await adminApi.deleteBranch(b._id);
      toast.success('Branch deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const openEditHotel = (h) => {
    setEditHotel(h);
    setHotelForm({ name: h.name, address: h.address || '', phone: h.phone || '', email: h.email || '', logo: h.logo || '🏨' });
  };

  const openEditBranch = (b) => {
    setEditBranch(b);
    setBranchForm({ hotel: b.hotel?._id || b.hotel, name: b.name, type: b.type || 'restaurant', address: b.address || '', phone: b.phone || '' });
  };

  const saveEditHotel = async () => {
    setSaving(true);
    try {
      await adminApi.updateHotel(editHotel._id, hotelForm);
      toast.success('Hotel updated');
      setEditHotel(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update hotel');
    } finally {
      setSaving(false);
    }
  };

  const saveEditBranch = async () => {
    setSaving(true);
    try {
      await adminApi.updateBranch(editBranch._id, branchForm);
      toast.success('Branch updated');
      setEditBranch(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update branch');
    } finally {
      setSaving(false);
    }
  };

  if (!hotels || !branches) return <DashboardLayout title="Organization"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Organization & Branches"
      actions={
        <>
          <Button variant="outline" onClick={() => setShowBranch(true)} disabled={hotels.length === 0}><Plus size={16} /> Branch</Button>
          <Button onClick={() => setShowHotel(true)}><Plus size={16} /> Hotel</Button>
        </>
      }
    >
      <div className="space-y-6">
        {hotels.length === 0 ? (
          <Empty icon="🏨" title="No hotels" subtitle="Create your first hotel to get started." />
        ) : (
          hotels.map((h) => {
            const hb = branches.filter((b) => String(b.hotel?._id || b.hotel) === String(h._id));
            return (
              <div key={h._id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{h.logo}</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{h.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={13} /> {h.address || 'No address'}</p>
                  </div>
                  <Badge className="bg-slate-100 dark:bg-neutral-800 dark:text-neutral-300 text-slate-600">{hb.length} branches</Badge>
                  <button onClick={() => openEditHotel(h)} className="text-slate-400 hover:text-brand-500 transition-colors" title="Edit hotel"><Pencil size={16} /></button>
                  <button onClick={() => removeHotel(h)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete hotel"><Trash2 size={16} /></button>
                </div>
                {hb.length === 0 ? (
                  <p className="text-sm text-slate-400">No branches yet.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {hb.map((b) => (
                      <div key={b._id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{b.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-brand-50 dark:bg-brand-500/20 dark:text-brand-400 text-brand-700">{b.type.replace('_', ' ')}</Badge>
                            <button onClick={() => openEditBranch(b)} className="text-slate-400 hover:text-brand-500 transition-colors" title="Edit branch"><Pencil size={14} /></button>
                            <button onClick={() => removeBranch(b)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete branch"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{b.address || 'No address'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal open={showHotel} onClose={() => setShowHotel(false)} title="New Hotel">
        <div className="space-y-4">
          <Input label="Hotel name" value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} />
          <Input label="Logo (emoji)" value={hotelForm.logo} onChange={(e) => setHotelForm({ ...hotelForm, logo: e.target.value })} />
          <Input label="Address" value={hotelForm.address} onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })} />
          <Input label="Phone" value={hotelForm.phone} onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })} />
          <Input label="Email" value={hotelForm.email} onChange={(e) => setHotelForm({ ...hotelForm, email: e.target.value })} />
          <Button className="w-full" onClick={saveHotel} disabled={saving}>{saving ? 'Creating...' : 'Create Hotel'}</Button>
        </div>
      </Modal>

      <Modal open={showBranch} onClose={() => setShowBranch(false)} title="New Branch">
        <div className="space-y-4">
          <Select label="Hotel" value={branchForm.hotel} onChange={(e) => setBranchForm({ ...branchForm, hotel: e.target.value })}>
            <option value="">Select...</option>
            {hotels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </Select>
          <Input label="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <Select label="Type" value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}>
            <option value="restaurant">Restaurant</option>
            <option value="bar">Bar</option>
            <option value="room_service">Room Service</option>
          </Select>
          <Input label="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <Input label="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
          <Button className="w-full" onClick={saveBranch} disabled={saving}>{saving ? 'Creating...' : 'Create Branch'}</Button>
        </div>
      </Modal>

      <Modal open={!!editHotel} onClose={() => setEditHotel(null)} title="Edit Hotel">
        <div className="space-y-4">
          <Input label="Hotel name" value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} />
          <Input label="Logo (emoji)" value={hotelForm.logo} onChange={(e) => setHotelForm({ ...hotelForm, logo: e.target.value })} />
          <Input label="Address" value={hotelForm.address} onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })} />
          <Input label="Phone" value={hotelForm.phone} onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })} />
          <Input label="Email" value={hotelForm.email} onChange={(e) => setHotelForm({ ...hotelForm, email: e.target.value })} />
          <Button className="w-full" onClick={saveEditHotel} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Modal>

      <Modal open={!!editBranch} onClose={() => setEditBranch(null)} title="Edit Branch">
        <div className="space-y-4">
          <Select label="Hotel" value={branchForm.hotel} onChange={(e) => setBranchForm({ ...branchForm, hotel: e.target.value })}>
            <option value="">Select...</option>
            {hotels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </Select>
          <Input label="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <Select label="Type" value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}>
            <option value="restaurant">Restaurant</option>
            <option value="bar">Bar</option>
            <option value="room_service">Room Service</option>
          </Select>
          <Input label="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <Input label="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
          <Button className="w-full" onClick={saveEditBranch} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
