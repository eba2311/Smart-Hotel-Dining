import React, { useEffect, useState } from 'react';
import { Plus, QrCode, Copy, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { tableApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Modal, Input, Select, Badge, Spinner, Empty } from '../../components/ui.jsx';
import QrDisplay from '../../components/QrDisplay.jsx';

export default function TablesPage() {
  const { branch, branches, setBranch } = useBranch();
  const toast = useToast();
  const [tab, setTab] = useState('tables');
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ number: '', seats: 2, floor: 1, roomType: 'Standard' });
  const [qrTarget, setQrTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ number: '', seats: 2, floor: 1, roomType: 'Standard' });

  const load = () => {
    if (!branch) return;
    setLoading(true);
    Promise.all([tableApi.tables(branch), tableApi.rooms(branch)])
      .then(([t, r]) => { setTables(t.data); setRooms(r.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [branch]);

  const add = async () => {
    try {
      if (tab === 'tables') await tableApi.createTable({ branch, number: form.number, seats: Number(form.seats) });
      else await tableApi.createRoom({ branch, number: form.number, floor: Number(form.floor), roomType: form.roomType });
      setShowAdd(false);
      setForm({ number: '', seats: 2, floor: 1, roomType: 'Standard' });
      load();
    } catch (e) { toast.error(e.message || 'Failed to create'); }
  };

  const remove = async (kind, id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      if (kind === 'table') await tableApi.deleteTable(id);
      else await tableApi.deleteRoom(id);
      toast.success('Deleted');
      load();
    } catch (e) { toast.error(e.message || 'Failed to delete'); }
  };

  const downloadQr = (item, kind) => {
    setQrTarget({ item, kind });
  };

  if (loading) return <DashboardLayout title="Tables & Rooms"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Tables & Rooms"
      actions={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add {tab === 'tables' ? 'Table' : 'Room'}</Button>
        </>
      }
    >
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('tables')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'tables' ? 'bg-brand-600 text-white' : 'bg-white border'}`}>
          Tables ({tables.length})
        </button>
        <button onClick={() => setTab('rooms')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'rooms' ? 'bg-brand-600 text-white' : 'bg-white border'}`}>
          Rooms ({rooms.length})
        </button>
      </div>

      {tab === 'tables' ? (
        tables.length === 0 ? (
          <Empty icon="🪑" title="No tables" subtitle="Add tables and generate their QR codes." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables.map((t) => (
              <div key={t._id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-lg">{t.label || `Table ${t.number}`}</p>
                  <Badge className={t.status === 'occupied' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>{t.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-3">{t.seats} seats</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="!py-1.5 text-xs flex-1" onClick={() => downloadQr(t, 'table')}>
                    <QrCode size={14} /> QR
                  </Button>
                  <Button variant="outline" className="!py-1.5 text-xs" onClick={async () => { try { await tableApi.regenerateTableQr(t._id); toast.success('QR regenerated'); load(); } catch (e) { toast.error(e.message || 'Failed to regenerate'); } }}>
                    <RefreshCw size={14} />
                  </Button>
                  <Button variant="outline" className="!py-1.5 text-xs !text-rose-500" onClick={() => remove('table', t._id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : rooms.length === 0 ? (
        <Empty icon="🛏️" title="No rooms" subtitle="Add hotel rooms and generate their QR codes." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((r) => (
            <div key={r._id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-lg">Room {r.number}</p>
                <Badge className={r.status === 'occupied' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>{r.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 mb-3">Floor {r.floor} · {r.roomType}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="!py-1.5 text-xs flex-1" onClick={() => downloadQr(r, 'room')}>
                  <QrCode size={14} /> QR
                </Button>
                <Button variant="outline" className="!py-1.5 text-xs" onClick={async () => { try { await tableApi.regenerateRoomQr(r._id); toast.success('QR regenerated'); load(); } catch (e) { toast.error(e.message || 'Failed to regenerate'); } }}>
                  <RefreshCw size={14} />
                </Button>
                <Button variant="outline" className="!py-1.5 text-xs !text-rose-500" onClick={() => remove('room', r._id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={tab === 'tables' ? 'Add Table' : 'Add Room'}>
        <div className="space-y-4">
          <Input label={tab === 'tables' ? 'Table number' : 'Room number'} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder={tab === 'tables' ? '01' : '101'} />
          {tab === 'tables' ? (
            <Input label="Seats" type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          ) : (
            <>
              <Input label="Floor" type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              <Input label="Room type" value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })} />
            </>
          )}
          <Button className="w-full" onClick={add}>Create</Button>
        </div>
      </Modal>

      {/* QR modal */}
      <Modal open={!!qrTarget} onClose={() => setQrTarget(null)} title={`QR Code — ${qrTarget?.kind === 'table' ? `Table ${qrTarget?.item.number}` : `Room ${qrTarget?.item.number}`}`}>
        {qrTarget && (
          <div className="flex flex-col items-center">
            <QrDisplay url={`${window.location.origin}${window.location.pathname}#/menu/${qrTarget.item.qrToken}`} size={240} />
            <p className="text-sm text-slate-500 mt-4 text-center">
              Guests scan this code to open the digital menu and place orders instantly.
            </p>
            <p className="text-xs text-slate-400 mt-1 break-all max-w-full">
              {`${window.location.origin}${window.location.pathname}#/menu/${qrTarget.item.qrToken}`}
            </p>
            <Button className="mt-4 w-full" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/menu/${qrTarget.item.qrToken}`).then(() => toast.success('QR link copied!'));
            }}>
              <Copy size={16} /> Copy Link
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
