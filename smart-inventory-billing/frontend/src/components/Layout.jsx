import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, Users, Boxes, Receipt, LogOut, UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['admin', 'manager', 'cashier'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'manager'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin', 'manager'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'manager', 'cashier'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-primary-600 leading-tight">Smart Inventory</h1>
          <p className="text-xs text-gray-400">& Billing System</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize mb-3">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
