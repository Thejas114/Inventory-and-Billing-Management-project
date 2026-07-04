import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Users from './pages/Users';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function Page({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Page><Dashboard /></Page>} />
      <Route path="/billing" element={<Page><Billing /></Page>} />
      <Route path="/products" element={<Page><Products /></Page>} />
      <Route path="/inventory" element={<Page roles={['admin', 'manager']}><Inventory /></Page>} />
      <Route path="/suppliers" element={<Page roles={['admin', 'manager']}><Suppliers /></Page>} />
      <Route path="/customers" element={<Page><Customers /></Page>} />
      <Route path="/users" element={<Page roles={['admin']}><Users /></Page>} />
    </Routes>
  );
}
