import { useEffect, useState } from 'react';
import { AlertTriangle, PlusCircle, MinusCircle, X } from 'lucide-react';
import api from '../api';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [changeQty, setChangeQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get('/inventory');
    setItems(res.data);
  }

  useEffect(() => { load(); }, []);

  function openAdjust(item) {
    setSelected(item);
    setChangeQty('');
    setReason('');
    setError('');
    setShowModal(true);
  }

  async function submitAdjust(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/inventory/adjust', {
        product_id: selected.id,
        change_qty: Number(changeQty),
        reason,
      });
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Adjustment failed.');
    }
  }

  const lowStockCount = items.filter((i) => i.low_stock).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Track and adjust stock levels</p>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={18} />
          {lowStockCount} product{lowStockCount > 1 ? 's are' : ' is'} at or below reorder level.
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="font-medium text-gray-900">{i.name}</td>
                <td>{i.sku}</td>
                <td>{i.category || '—'}</td>
                <td>{i.stock_qty}</td>
                <td>{i.reorder_level}</td>
                <td>
                  {i.low_stock ? (
                    <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-1 rounded-full">Low Stock</span>
                  ) : (
                    <span className="text-xs font-semibold bg-green-50 text-green-600 px-2 py-1 rounded-full">OK</span>
                  )}
                </td>
                <td>
                  <button onClick={() => openAdjust(i)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Adjust Stock — {selected?.name}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Current stock: <strong>{selected?.stock_qty}</strong></p>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
            <form onSubmit={submitAdjust} className="space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setChangeQty((q) => String(Math.abs(Number(q) || 0)))}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${Number(changeQty) >= 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                  <PlusCircle size={16} /> Stock In
                </button>
                <button type="button" onClick={() => setChangeQty((q) => String(-Math.abs(Number(q) || 0)))}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${Number(changeQty) < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
                  <MinusCircle size={16} /> Stock Out
                </button>
              </div>
              <div>
                <label className="label">Quantity (use negative for stock out)</label>
                <input type="number" className="input" required value={changeQty}
                  onChange={(e) => setChangeQty(e.target.value)} />
              </div>
              <div>
                <label className="label">Reason</label>
                <input className="input" required placeholder="e.g. New shipment received, Damaged goods"
                  value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
