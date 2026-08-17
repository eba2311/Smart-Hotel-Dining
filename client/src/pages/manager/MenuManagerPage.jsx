import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UploadCloud, Image as ImageIcon, X, Search } from 'lucide-react';
import { catalogApi, uploadApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Button, Modal, Input, Select, Textarea, Badge, Spinner, Empty } from '../../components/ui.jsx';
import { fmtMoney } from '../../lib/format.js';
import DishImage from '../../components/DishImage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const emptyItem = {
  name: '', description: '', image: '', price: 100, promotionPrice: '',
  ingredients: [], allergens: [], calories: 100, prepTimeMinutes: 15,
  available: true, special: false, options: [], category: '',
};

export default function MenuManagerPage() {
  const { branch, branches, setBranch } = useBranch();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [showItem, setShowItem] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCat, setShowCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', icon: '🍽️', sortOrder: 0 });
  const [itemForm, setItemForm] = useState({ ...emptyItem });
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [search, setSearch] = useState('');

  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1000;
        let { width, height } = img;
        if (width > height && width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        else if (height >= width && height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Could not read that image file'));
      img.src = URL.createObjectURL(file);
    });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    setUploadingImg(true);
    try {
      const dataUrl = await resizeImage(file);
      const res = await uploadApi.image(dataUrl);
      setItemForm((f) => ({ ...f, image: res.data.url }));
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImg(false);
    }
  };

  const load = () => {
    if (!branch) return;
    Promise.all([catalogApi.all(branch), catalogApi.categories(branch)]).then(([itemsRes, catRes]) => {
      setData({ items: itemsRes.data, categories: catRes.data });
    });
  };

  useEffect(() => {
    if (!branch) return;
    setData(null);
    load();
  }, [branch]);

  useEffect(() => {
    if (!branch) return;
    import('../../lib/api.js').then(({ inventoryApi }) =>
      inventoryApi.list(branch).then((res) => setIngredients(res.data)).catch(() => {})
    );
  }, [branch]);

  const saveItem = async () => {
    setSaving(true);
    try {
      const payload = {
        ...itemForm,
        branch,
        promotionPrice: itemForm.promotionPrice ? Number(itemForm.promotionPrice) : undefined,
        price: Number(itemForm.price),
        calories: Number(itemForm.calories),
        prepTimeMinutes: Number(itemForm.prepTimeMinutes),
      };
      if (editing) await catalogApi.updateItem(editing._id, payload);
      else await catalogApi.createItem(payload);
      setShowItem(false);
      toast.success(editing ? 'Item updated' : 'Item created');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    setSaving(true);
    try {
      await catalogApi.createCategory({ ...catForm, branch });
      setShowCat(false);
      setCatForm({ name: '', description: '', icon: '🍽️', sortOrder: 0 });
      toast.success('Category created');
      load();
    } catch (e) { toast.error(e.message || 'Failed to create category'); } finally { setSaving(false); }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    await catalogApi.deleteItem(item._id);
    toast.success('Item deleted');
    load();
  };

  const deleteCat = async (c) => {
    if (!confirm(`Delete category ${c.name}?`)) return;
    try {
      await catalogApi.deleteCategory(c._id);
      toast.success('Category deleted');
      load();
    } catch (e) { toast.error(e.message || 'Failed to delete category'); }
  };

  const updateCategory = async () => {
    setSaving(true);
    try {
      await catalogApi.updateCategory(editingCat._id, catForm);
      setShowCat(false);
      setEditingCat(null);
      setCatForm({ name: '', description: '', icon: '🍽️', sortOrder: 0 });
      toast.success('Category updated');
      load();
    } catch (e) { toast.error(e.message || 'Failed to update category'); } finally { setSaving(false); }
  };

  const toggleAllAvailability = async (available) => {
    if (!branch) return;
    try {
      const res = await catalogApi.bulkAvailability(branch, available);
      toast.success(`${res.data.modified} items ${available ? 'enabled' : 'disabled'}`);
      load();
    } catch (e) { toast.error(e.message || 'Failed to toggle availability'); }
  };

  if (!data) return <DashboardLayout title="Menu Management"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Menu Management"
      actions={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Button onClick={() => setShowCat(true)} variant="outline"><Plus size={16} /> Category</Button>
          <Button onClick={() => { setEditing(null); setItemForm({ ...emptyItem, category: data.categories[0]?._id }); setShowItem(true); }}>
            <Plus size={16} /> Menu Item
          </Button>
          <Button onClick={() => toggleAllAvailability(false)} variant="outline" className="!text-rose-500">Disable All</Button>
          <Button onClick={() => toggleAllAvailability(true)} variant="outline" className="!text-emerald-500">Enable All</Button>
        </>
      }
    >
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-8">
        {data.categories.map((c) => {
          const items = data.items.filter((i) => String(i.category?._id || i.category) === String(c._id))
            .filter((i) => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()));
          return (
            <div key={c._id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="text-xl">{c.icon}</span> {c.name}
                  <Badge className="bg-slate-100 text-slate-500">{items.length} items</Badge>
                </h2>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingCat(c); setCatForm({ name: c.name, description: c.description || '', icon: c.icon || '🍽️', sortOrder: c.sortOrder || 0 }); setShowCat(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteCat(c)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 mb-4">No items in this category.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {items.map((i) => (
                    <div key={i._id} className="card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <DishImage src={i.image} alt={i.name} size="w-20 h-20" textSize="text-4xl" />
                          <div>
                            <p className="font-semibold">{i.name}</p>
                            <p className="text-xs text-slate-400">{i.calories} kcal · {i.prepTimeMinutes} min</p>
                          </div>
                        </div>
                        <Badge className={i.available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                          {i.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          {i.promotionPrice && i.promotionPrice < i.price ? (
                            <div>
                              <span className="text-sm text-slate-400 line-through mr-1">{fmtMoney(i.price)}</span>
                              <span className="font-bold text-brand-700">{fmtMoney(i.promotionPrice)}</span>
                            </div>
                          ) : (
                            <span className="font-bold">{fmtMoney(i.price)}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditing(i); setItemForm({ ...emptyItem, ...i, promotionPrice: i.promotionPrice || '' }); setShowItem(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteItem(i)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {data.items.length === 0 && <Empty title="No menu items" subtitle="Add a category and menu item to get started." />}
      </div>

      {/* Category modal */}
      <Modal open={showCat} onClose={() => { setShowCat(false); setEditingCat(null); setCatForm({ name: '', description: '', icon: '🍽️', sortOrder: 0 }); }} title={editingCat ? `Edit ${editingCat.name}` : 'New Category'}>
        <div className="space-y-4">
          <Input label="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
          <Input label="Icon (emoji)" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} />
          <Textarea label="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
          <Button className="w-full" onClick={editingCat ? updateCategory : saveCategory} loading={saving}>
            {editingCat ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Item modal */}
      <Modal open={showItem} onClose={() => setShowItem(false)} title={editing ? `Edit ${editing.name}` : 'New Menu Item'} wide>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          </div>
          <Select label="Category" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
            <option value="">Select...</option>
            {data.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <div className="space-y-3">
            <p className="label">Photo</p>
            <div className="flex items-center gap-3">
              {itemForm.image ? (
                <DishImage src={itemForm.image} alt="Preview" size="w-20 h-20" textSize="text-4xl" />
              ) : (
                <span className="w-20 h-20 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <ImageIcon size={22} />
                </span>
              )}
              <div className="flex-1 space-y-2">
                <label className="btn btn-outline inline-flex items-center gap-2 cursor-pointer">
                  <UploadCloud size={16} />
                  {uploadingImg ? 'Uploading...' : 'Upload photo from computer'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploadingImg} />
                </label>
                {itemForm.image && (
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, image: '' })}
                    className="block text-xs text-rose-500 hover:text-rose-700 inline-flex items-center gap-1"
                  >
                    <X size={13} /> Remove photo
                  </button>
                )}
              </div>
            </div>
            <Input
              label="Or paste an image link (URL)"
              placeholder="https://.../photo.jpg"
              value={itemForm.image.startsWith('http') ? itemForm.image : ''}
              onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
            />
          </div>
          <Input label="Price (ETB)" type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
          <Input label="Promo price (optional)" type="number" value={itemForm.promotionPrice} onChange={(e) => setItemForm({ ...itemForm, promotionPrice: e.target.value })} />
          <Input label="Calories" type="number" value={itemForm.calories} onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })} />
          <Input label="Prep time (min)" type="number" value={itemForm.prepTimeMinutes} onChange={(e) => setItemForm({ ...itemForm, prepTimeMinutes: e.target.value })} />
          <div className="sm:col-span-2">
            <Input
              label="Ingredients (comma separated)"
              value={(itemForm.ingredients || []).join(', ')}
              onChange={(e) => setItemForm({ ...itemForm, ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Allergens (comma separated)"
              value={(itemForm.allergens || []).join(', ')}
              onChange={(e) => setItemForm({ ...itemForm, allergens: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="label">Link ingredients to inventory (deducts stock on each sale)</p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => {
                const linked = (itemForm.ingredientLinks || []).find((l) => String(l.ingredient) === String(ing._id));
                return (
                  <button
                    key={ing._id}
                    onClick={() => {
                      const links = [...(itemForm.ingredientLinks || [])];
                      const idx = links.findIndex((l) => String(l.ingredient) === String(ing._id));
                      if (idx >= 0) links.splice(idx, 1);
                      else links.push({ ingredient: ing._id, quantity: ing.unit === 'unit' ? 1 : 100 });
                      setItemForm({ ...itemForm, ingredientLinks: links });
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${linked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    {ing.name}{linked ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="label">Customization Options</p>
            <div className="space-y-3">
              {(itemForm.options || []).map((opt, oi) => (
                <div key={oi} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input label="Option name" value={opt.name || ''} onChange={(e) => {
                      const opts = [...itemForm.options]; opts[oi] = { ...opts[oi], name: e.target.value }; setItemForm({ ...itemForm, options: opts });
                    }} />
                    <Select label="Type" value={opt.type || 'single'} onChange={(e) => {
                      const opts = [...itemForm.options]; opts[oi] = { ...opts[oi], type: e.target.value }; setItemForm({ ...itemForm, options: opts });
                    }}>
                      <option value="single">Single choice</option>
                      <option value="multi">Multiple choice</option>
                    </Select>
                    <button onClick={() => { const opts = [...itemForm.options]; opts.splice(oi, 1); setItemForm({ ...itemForm, options: opts }); }} className="mt-6 p-1.5 text-rose-400 hover:text-rose-600"><Trash2 size={15} /></button>
                  </div>
                  <div className="space-y-1.5">
                    {(opt.choices || []).map((ch, ci) => (
                      <div key={ci} className="flex items-center gap-2 text-sm">
                        <input className="input flex-1" placeholder="Label" value={ch.label || ''} onChange={(e) => {
                          const opts = [...itemForm.options]; const choices = [...opts[oi].choices]; choices[ci] = { ...choices[ci], label: e.target.value }; opts[oi] = { ...opts[oi], choices }; setItemForm({ ...itemForm, options: opts });
                        }} />
                        <input className="input w-24" type="number" placeholder="Price Δ" value={ch.priceDelta || 0} onChange={(e) => {
                          const opts = [...itemForm.options]; const choices = [...opts[oi].choices]; choices[ci] = { ...choices[ci], priceDelta: Number(e.target.value) }; opts[oi] = { ...opts[oi], choices }; setItemForm({ ...itemForm, options: opts });
                        }} />
                        <button onClick={() => { const opts = [...itemForm.options]; const choices = [...opts[oi].choices]; choices.splice(ci, 1); opts[oi] = { ...opts[oi], choices }; setItemForm({ ...itemForm, options: opts }); }} className="text-rose-400 hover:text-rose-600"><X size={14} /></button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const opts = [...itemForm.options]; const choices = [...(opts[oi].choices || []), { id: `ch_${Date.now()}`, label: '', priceDelta: 0 }]; opts[oi] = { ...opts[oi], choices }; setItemForm({ ...itemForm, options: opts });
                    }} className="text-xs text-brand-600 hover:text-brand-700 font-semibold">+ Add choice</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setItemForm({ ...itemForm, options: [...(itemForm.options || []), { id: `opt_${Date.now()}`, name: '', type: 'single', choices: [] }] })} className="btn-outline text-xs w-full">+ Add option group</button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="accent-brand-600" checked={itemForm.available} onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })} />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="accent-brand-600" checked={itemForm.special} onChange={(e) => setItemForm({ ...itemForm, special: e.target.checked })} />
            Special / featured
          </label>
        </div>
        <Button className="w-full mt-5" onClick={saveItem} loading={saving}>
          {editing ? 'Save Changes' : 'Create Item'}
        </Button>
      </Modal>
    </DashboardLayout>
  );
}
