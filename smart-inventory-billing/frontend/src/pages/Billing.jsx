import { useEffect, useState } from 'react';
import { Plus, Trash2, Download, Receipt, Ban } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Billing() {
  const { hasRole } = useAuth();
  const [tab, setTab] = useState('new');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">Create invoices and manage sales history</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('new')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'new' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          New Invoice
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
        >
          Invoice History
        </button>
      </div>

      {tab === 'new' ? <NewInvoice onCreated={() => setTab('history')} /> : <InvoiceHistory canVoid={hasRole('admin')} />}
    </div>
  );
}

function NewInvoice({ onCreated }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data));
    api.get('/customers').then((res) => setCustomers(res.data));
  }, []);

  function addLineItem() {
    if (!productId) return;
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;
    const existing = lineItems.find((li) => li.product_id === product.id);
    if (existing) {
      setLineItems(lineItems.map((li) =>
        li.product_id === product.id ? { ...li, quantity: li.quantity + Number(qty) } : li
      ));
    } else {
      setLineItems([...lineItems, {
        product_id: product.id, name: product.name, unit_price: product.selling_price,
        quantity: Number(qty), available: product.stock_qty,
      }]);
    }
    setProductId('');
    setQty(1);
  }

  function removeLineItem(productId) {
    setLineItems(lineItems.filter((li) => li.product_id !== productId));
  }

  function updateQty(productId, newQty) {
    setLineItems(lineItems.map((li) => li.product_id === productId ? { ...li, quantity: Number(newQty) } : li));
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const taxAmount = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + taxAmount - Number(discount || 0);

  async function handleCheckout() {
    setError('');
    setSuccess(null);
    if (lineItems.length === 0) {
      setError('Add at least one product to the invoice.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/billing', {
        customer_id: customerId ? Number(customerId) : null,
        items: lineItems.map((li) => ({ product_id: li.product_id, quantity: li.quantity, unit_price: li.unit_price })),
        tax_percent: Number(taxPercent) || 0,
        discount: Number(discount) || 0,
        payment_method: paymentMethod,
      });
      setSuccess(res.data);
      setLineItems([]);
      setCustomerId('');
      setTaxPercent(0);
      setDiscount(0);
      api.get('/products').then((r) => setProducts(r.data)); // refresh stock
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Products</h2>
          <div className="flex gap-2">
            <select className="input flex-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock_qty === 0}>
                  {p.name} — Rs. {p.selling_price} ({p.stock_qty} in stock{p.stock_qty === 0 ? ', OUT OF STOCK' : ''})
                </option>
              ))}
            </select>
            <input type="number" min="1" className="input w-24" value={qty} onChange={(e) => setQty(e.target.value)} />
            <button onClick={addLineItem} className="btn-primary flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th><th></th></tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.product_id}>
                  <td className="font-medium text-gray-900">{li.name}</td>
                  <td>
                    <input type="number" min="1" max={li.available} className="input w-20 py-1"
                      value={li.quantity} onChange={(e) => updateQty(li.product_id, e.target.value)} />
                  </td>
                  <td>Rs. {li.unit_price.toFixed(2)}</td>
                  <td>Rs. {(li.unit_price * li.quantity).toFixed(2)}</td>
                  <td>
                    <button onClick={() => removeLineItem(li.product_id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">No items added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Customer & Payment</h2>
          <div>
            <label className="label">Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tax (%)</label>
              <input type="number" className="input" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </div>
            <div>
              <label className="label">Discount (Rs.)</label>
              <input type="number" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span><span>Rs. {taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Discount</span><span>- Rs. {Number(discount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
            <span>Total</span><span>Rs. {total.toFixed(2)}</span>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm px-3 py-3 rounded-lg space-y-2">
              <p>Invoice {success.invoice_no} created successfully.</p>
              <a
                href={`${api.defaults.baseURL}/billing/${success.id}/pdf`}
                onClick={(e) => {
                  e.preventDefault();
                  downloadInvoicePdf(success.id, success.invoice_no);
                }}
                className="inline-flex items-center gap-1 text-primary-700 font-medium hover:underline cursor-pointer"
              >
                <Download size={14} /> Download PDF
              </a>
            </div>
          )}

          <button onClick={handleCheckout} disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            <Receipt size={16} /> {submitting ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function downloadInvoicePdf(id, invoiceNo) {
  const res = await api.get(`/billing/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${invoiceNo}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function InvoiceHistory({ canVoid }) {
  const [invoices, setInvoices] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    const res = await api.get('/billing', { params: { from: from || undefined, to: to || undefined } });
    setInvoices(res.data);
  }

  useEffect(() => { load(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVoid(id) {
    if (!confirm('Void this invoice and restore stock?')) return;
    await api.delete(`/billing/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Cashier</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="font-medium text-gray-900">{inv.invoice_no}</td>
                <td>{new Date(inv.created_at).toLocaleString()}</td>
                <td>{inv.customer_name || 'Walk-in'}</td>
                <td>{inv.cashier_name}</td>
                <td>Rs. {inv.total.toFixed(2)}</td>
                <td>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${inv.status === 'voided' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'}`}>
                    {inv.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-3">
                    <button onClick={() => downloadInvoicePdf(inv.id, inv.invoice_no)} className="text-primary-600 hover:text-primary-800">
                      <Download size={16} />
                    </button>
                    {canVoid && inv.status !== 'voided' && (
                      <button onClick={() => handleVoid(inv.id)} className="text-red-500 hover:text-red-700">
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
