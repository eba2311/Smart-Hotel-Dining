import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import GuestMenuPage from './pages/GuestMenuPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import TrackOrderPage from './pages/TrackOrderPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';

import KitchenDashboard from './pages/KitchenDashboard.jsx';
import WaiterDashboard from './pages/WaiterDashboard.jsx';

import ManagerDashboard from './pages/manager/DashboardPage.jsx';
import OrdersManagerPage from './pages/manager/OrdersManagerPage.jsx';
import MenuManagerPage from './pages/manager/MenuManagerPage.jsx';
import TablesPage from './pages/manager/TablesPage.jsx';
import InventoryPage from './pages/manager/InventoryPage.jsx';
import CouponManagerPage from './pages/manager/CouponManagerPage.jsx';
import StaffPage from './pages/manager/StaffPage.jsx';
import FeedbackManagerPage from './pages/manager/FeedbackPage.jsx';
import AnalyticsPage from './pages/manager/AnalyticsPage.jsx';

import AdminHomePage from './pages/admin/AdminHomePage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';
import AuditLogsPage from './pages/admin/AuditLogsPage.jsx';

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'kitchen') return <Navigate to="/kitchen" replace />;
  if (user.role === 'waiter') return <Navigate to="/waiter" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Guest flow */}
            <Route path="/menu/:qrToken" element={<GuestMenuPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track/:orderId" element={<TrackOrderPage />} />
            <Route path="/history/:customerId" element={<OrderHistoryPage />} />
            <Route path="/feedback/:orderId" element={<FeedbackPage />} />

            {/* Profile (all roles) */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Staff */}
            <Route path="/kitchen" element={<ProtectedRoute role="kitchen"><KitchenDashboard /></ProtectedRoute>} />
            <Route path="/waiter" element={<ProtectedRoute role="waiter"><WaiterDashboard /></ProtectedRoute>} />

            {/* Manager */}
            <Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/orders" element={<ProtectedRoute role="manager"><OrdersManagerPage /></ProtectedRoute>} />
            <Route path="/manager/menu" element={<ProtectedRoute role="manager"><MenuManagerPage /></ProtectedRoute>} />
            <Route path="/manager/tables" element={<ProtectedRoute role="manager"><TablesPage /></ProtectedRoute>} />
            <Route path="/manager/inventory" element={<ProtectedRoute role="manager"><InventoryPage /></ProtectedRoute>} />
            <Route path="/manager/coupons" element={<ProtectedRoute role="manager"><CouponManagerPage /></ProtectedRoute>} />
            <Route path="/manager/staff" element={<ProtectedRoute role="manager"><StaffPage /></ProtectedRoute>} />
            <Route path="/manager/feedback" element={<ProtectedRoute role="manager"><FeedbackManagerPage /></ProtectedRoute>} />
            <Route path="/manager/analytics" element={<ProtectedRoute role="manager"><AnalyticsPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHomePage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLogsPage /></ProtectedRoute>} />

            <Route path="*" element={<RoleHome />} />
          </Routes>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
