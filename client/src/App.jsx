import { Routes, Route, Navigate, lazy, Suspense } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Spinner } from './components/ui.jsx';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const GuestMenuPage = lazy(() => import('./pages/GuestMenuPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage.jsx'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage.jsx'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage.jsx'));
const ReceiptPage = lazy(() => import('./pages/ReceiptPage.jsx'));

const KitchenDashboard = lazy(() => import('./pages/KitchenDashboard.jsx'));
const WaiterDashboard = lazy(() => import('./pages/WaiterDashboard.jsx'));

const ManagerDashboard = lazy(() => import('./pages/manager/DashboardPage.jsx'));
const OrdersManagerPage = lazy(() => import('./pages/manager/OrdersManagerPage.jsx'));
const MenuManagerPage = lazy(() => import('./pages/manager/MenuManagerPage.jsx'));
const TablesPage = lazy(() => import('./pages/manager/TablesPage.jsx'));
const InventoryPage = lazy(() => import('./pages/manager/InventoryPage.jsx'));
const CouponManagerPage = lazy(() => import('./pages/manager/CouponManagerPage.jsx'));
const StaffPage = lazy(() => import('./pages/manager/StaffPage.jsx'));
const FeedbackManagerPage = lazy(() => import('./pages/manager/FeedbackPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/manager/AnalyticsPage.jsx'));

const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage.jsx'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage.jsx'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
      <Spinner label="Loading..." />
    </div>
  );
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'kitchen') return <Navigate to="/kitchen" replace />;
  if (user.role === 'waiter') return <Navigate to="/waiter" replace />;
  return <Navigate to="/" replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-6">
      <div className="max-w-md w-full text-center">
        <p className="text-7xl font-black text-brand-500 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-slate-500 dark:text-neutral-400 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <CartProvider>
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/receipt/:orderId" element={<ReceiptPage />} />

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

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </CartProvider>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}