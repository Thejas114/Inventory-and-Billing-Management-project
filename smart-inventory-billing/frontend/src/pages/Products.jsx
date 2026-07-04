import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  name: '', sku: '', category: '', description: '',
  cost_price: '', selling_price: '', stock_qty: '', reorder_level: 5, supplier_id: '',
};

export default function Products() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function loadProducts() {
    const res = await api.get('/products', { params: { search } });
    setProducts(res.data);
  }

  useEffect(() => {
    loadProducts();
    api.get('/suppliers').then((res) => setSuppliers(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowModal(true);
  }

  function openEdit(p) {
    setForm({
      name: p.name, sku: p.sku, category: p.category || '', description: p.description || '',
      cost_price: p.cost_price, selling_price: p.selling_price, stock_qty: p.stock_qty,
      reorder_level: p.reorder_level, supplier_id: p.supplier_id || '',
    });
    setEditingId(p.id);
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        stock_qty: Number(form.stock_qty) || 0,
        reorder_level: Number(form.reorder_level) || 5,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      };
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your product catalog</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Supplier</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-gray-900">{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category || '—'}</td>
                <td>Rs. {p.cost_price.toFixed(2)}</td>
                <td>Rs. {p.selling_price.toFixed(2)}</td>
                <td>
                  <span className={p.stock_qty <= p.reorder_level ? 'text-red-600 font-semibold' : ''}>
                    {p.stock_qty}
                  </span>
                </td>
                <td>{p.supplier_name || '—'}</td>
                {canEdit && (
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-primary-600 hover:text-primary-800">
                        <Pencil size={16} />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input className="input" required value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <select className="input" value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                    <option value="">— None —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cost Price (Rs.)</label>
                  <input type="number" step="0.01" className="input" value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                </div>
                <div>
                  <label className="label">Selling Price (Rs.)</label>
                  <input type="number" step="0.01" className="input" required value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    {editingId ? 'Stock Qty (use Inventory page to adjust)' : 'Initial Stock Qty'}
                  </label>
                  <input type="number" className="input" disabled={!!editingId} value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
                </div>
                <div>
                  <label className="label">Reorder Level</label>
                  <input type="number" className="input" value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
