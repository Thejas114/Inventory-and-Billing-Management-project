import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IndianRupee, Receipt, Package, AlertTriangle } from 'lucide-react';
import api from '../api';

const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const TONE_CLASSES = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.primary;
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${toneClasses.bg}`}>
        <Icon className={toneClasses.text} size={20} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [salesByDate, setSalesByDate] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, sbd, tp, sbc] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/sales-by-date?days=14'),
          api.get('/analytics/top-products?limit=5'),
          api.get('/analytics/sales-by-category'),
        ]);
        setSummary(s.data);
        setSalesByDate(sbd.data);
        setTopProducts(tp.data);
        setSalesByCategory(sbc.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your store's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`Rs. ${summary.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          sub={`Today: Rs. ${summary.today_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          icon={Receipt}
          label="Total Invoices"
          value={summary.total_invoices}
          sub={`Today: ${summary.today_invoices}`}
        />
        <StatCard
          icon={Package}
          label="Products"
          value={summary.product_count}
          sub={`${summary.customer_count} customers`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={summary.low_stock_count}
          tone="amber"
          sub="Needs reordering"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sales Trend (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={salesByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={salesByCategory}
                dataKey="revenue"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => entry.category}
              >
                {salesByCategory.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Selling Products</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11 }} width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="units_sold" fill="#4f46e5" name="Units Sold" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
