import { Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { lazy, Suspense } from 'react';
import NotificationBell from './components/NotificationBell';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyOtp = lazy(() => import('./pages/VerifyOtp'));
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const CustomerServices = lazy(() => import('./pages/customer/ServiceBrowse'));
const CustomerServiceDetail = lazy(() => import('./pages/customer/ServiceDetail'));
const CustomerRequest = lazy(() => import('./pages/customer/RequestService'));
const CustomerRequestDetail = lazy(() => import('./pages/customer/RequestDetail'));
const CustomerBookings = lazy(() => import('./pages/customer/Bookings'));
const CustomerBookingDetail = lazy(() => import('./pages/customer/BookingDetail'));
const CustomerPayment = lazy(() => import('./pages/customer/Payment'));
const CustomerInvoice = lazy(() => import('./pages/customer/Invoice'));
const CustomerHistory = lazy(() => import('./pages/customer/History'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const CustomerDisputes = lazy(() => import('./pages/shared/Disputes'));
const WorkerDashboard = lazy(() => import('./pages/worker/Dashboard'));
const WorkerProfile = lazy(() => import('./pages/worker/Profile'));
const WorkerSkills = lazy(() => import('./pages/worker/Skills'));
const WorkerAvailability = lazy(() => import('./pages/worker/Availability'));
const WorkerJobs = lazy(() => import('./pages/worker/AssignedJobs'));
const WorkerJobDetail = lazy(() => import('./pages/worker/JobDetail'));
const WorkerEarnings = lazy(() => import('./pages/worker/Earnings'));
const WorkerHistory = lazy(() => import('./pages/worker/History'));
const WorkerDisputes = lazy(() => import('./pages/shared/Disputes'));
const CooperativeDashboard = lazy(() => import('./pages/cooperative/Dashboard'));
const CooperativeWorkers = lazy(() => import('./pages/cooperative/WorkerManagement'));
const CooperativeWorkerDetail = lazy(() => import('./pages/cooperative/WorkerDetail'));
const CooperativeRequests = lazy(() => import('./pages/cooperative/RequestQueue'));
const CooperativeRequestDetail = lazy(() => import('./pages/cooperative/RequestDetail'));
const CooperativeAllocations = lazy(() => import('./pages/cooperative/Allocations'));
const CooperativePerformance = lazy(() => import('./pages/cooperative/Performance'));
const CooperativeDemand = lazy(() => import('./pages/cooperative/DemandAnalytics'));
const CooperativeDisputes = lazy(() => import('./pages/shared/Disputes'));
const FederationDashboard = lazy(() => import('./pages/federation/Dashboard'));
const FederationCooperatives = lazy(() => import('./pages/federation/Cooperatives'));
const FederationDemand = lazy(() => import('./pages/federation/RegionalDemand'));
const FederationWorkforce = lazy(() => import('./pages/federation/WorkforceOverview'));
const FederationPerformance = lazy(() => import('./pages/federation/Performance'));
const UnifiedDashboard = lazy(() => import('./pages/shared/UnifiedDashboard'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const SocietyWorkforce = lazy(() => import('./pages/cooperative/Workforce'));
const WorkforceDetail = lazy(() => import('./pages/cooperative/WorkforceDetail'));
const FederationHiring = lazy(() => import('./pages/federation/Workforce'));
const Scanner = lazy(() => import('./pages/shared/Scanner'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirectMap = {
      customer: '/customer/dashboard',
      worker: '/worker/dashboard',
      cooperative_admin: '/unified-dashboard',
      federation_admin: '/unified-dashboard',
      platform_admin: '/admin',
    };
    return <Navigate to={redirectMap[user?.role] || '/'} replace />;
  }
  return children;
}

function SidebarLink({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function CustomerSidebar({ t }) {
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/customer/dashboard" icon="📊" label={t('nav.dashboard')} />
      <SidebarLink to="/customer/services" icon="🔧" label={t('nav.services')} />
      <SidebarLink to="/customer/request" icon="📝" label={t('customer.requestService')} />
      <SidebarLink to="/customer/bookings" icon="📅" label={t('nav.bookings')} />
      <SidebarLink to="/customer/history" icon="📜" label={t('nav.history')} />
      <SidebarLink to="/scanner" icon="📷" label="QR Scanner" />
      <SidebarLink to="/customer/disputes" icon="⚠️" label="Disputes" />
      <SidebarLink to="/customer/profile" icon="👤" label={t('nav.profile')} />
    </nav>
  );
}

function WorkerSidebar({ t }) {
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/worker/dashboard" icon="📊" label={t('nav.dashboard')} />
      <SidebarLink to="/worker/jobs" icon="📋" label={t('nav.assignedJobs')} />
      <SidebarLink to="/scanner" icon="📷" label="QR Scanner" />
      <SidebarLink to="/worker/skills" icon="🛠️" label={t('nav.skills')} />
      <SidebarLink to="/worker/availability" icon="📅" label={t('nav.availability')} />
      <SidebarLink to="/worker/earnings" icon="💰" label={t('nav.earnings')} />
      <SidebarLink to="/worker/history" icon="📜" label={t('nav.history')} />
      <SidebarLink to="/worker/disputes" icon="⚠️" label="Disputes" />
      <SidebarLink to="/worker/profile" icon="👤" label={t('nav.profile')} />
    </nav>
  );
}

function CooperativeSidebar({ t }) {
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/unified-dashboard" icon="🏛️" label="Unified Command Center" />
      <SidebarLink to="/cooperative/dashboard" icon="📊" label={t('nav.dashboard')} />
      <SidebarLink to="/scanner" icon="📷" label="QR Scanner" />
      <SidebarLink to="/cooperative/workers" icon="👷" label={t('nav.workers')} />
      <SidebarLink to="/cooperative/requests" icon="📥" label={t('nav.requests')} />
      <SidebarLink to="/cooperative/workforce" icon="👥" label="Workforce" />
      <SidebarLink to="/cooperative/allocations" icon="🔗" label={t('nav.allocations')} />
      <SidebarLink to="/cooperative/performance" icon="📈" label={t('nav.performance')} />
      <SidebarLink to="/cooperative/demand" icon="📉" label={t('nav.demand')} />
      <SidebarLink to="/cooperative/disputes" icon="⚠️" label="Disputes" />
    </nav>
  );
}

function FederationSidebar({ t }) {
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/unified-dashboard" icon="🏛️" label="Unified Command Center" />
      <SidebarLink to="/federation/dashboard" icon="📊" label={t('nav.dashboard')} />
      <SidebarLink to="/scanner" icon="📷" label="QR Scanner" />
      <SidebarLink to="/federation/cooperatives" icon="🏢" label={t('federation.cooperativeManagement')} />
      <SidebarLink to="/federation/demand" icon="📈" label={t('federation.regionalDemand')} />
      <SidebarLink to="/federation/workforce" icon="👷" label={t('nav.workforce')} />
      <SidebarLink to="/federation/hiring" icon="👥" label="Workforce Needs" />
      <SidebarLink to="/federation/performance" icon="📉" label={t('nav.performance')} />
    </nav>
  );
}

function PlatformAdminSidebar() {
  return (
    <nav className="flex flex-col gap-1">
      <SidebarLink to="/admin" icon="🛡️" label="Admin Panel" />
      <SidebarLink to="/scanner" icon="📷" label="QR Scanner" />
    </nav>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const sidebarMap = {
    customer: <CustomerSidebar t={t} />,
    worker: <WorkerSidebar t={t} />,
    cooperative_admin: <CooperativeSidebar t={t} />,
    federation_admin: <FederationSidebar t={t} />,
    platform_admin: <PlatformAdminSidebar />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">{t('common.appName')}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/scanner"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200/60"
            title="Open QR Scanner"
          >
            <span>📷</span>
            <span className="hidden sm:inline">QR Scanner</span>
          </Link>
          <NotificationBell />
          <span className="text-sm text-gray-600">
            {t('common.welcome')}, <span className="font-medium text-gray-900">{user?.name || user?.email}</span>
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
            {user?.role?.replace('_', ' ')}
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            {t('common.logout')}
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] p-4 sticky top-[57px]">
          {sidebarMap[user?.role]}
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/services" element={<CustomerServices />} />
          <Route path="/customer/services/:id" element={<CustomerServiceDetail />} />
          <Route path="/customer/request" element={<CustomerRequest />} />
          <Route path="/customer/requests/:id" element={<CustomerRequestDetail />} />
          <Route path="/customer/bookings" element={<CustomerBookings />} />
          <Route path="/customer/bookings/:id" element={<CustomerBookingDetail />} />
          <Route path="/customer/payment/:id" element={<CustomerPayment />} />
          <Route path="/customer/invoice/:id" element={<CustomerInvoice />} />
          <Route path="/customer/history" element={<CustomerHistory />} />
          <Route path="/customer/profile" element={<CustomerProfile />} />
          <Route path="/customer/disputes" element={<CustomerDisputes />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['worker']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/worker/dashboard" element={<WorkerDashboard />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />
          <Route path="/worker/skills" element={<WorkerSkills />} />
          <Route path="/worker/availability" element={<WorkerAvailability />} />
          <Route path="/worker/jobs" element={<WorkerJobs />} />
          <Route path="/worker/jobs/:id" element={<WorkerJobDetail />} />
          <Route path="/worker/earnings" element={<WorkerEarnings />} />
          <Route path="/worker/history" element={<WorkerHistory />} />
          <Route path="/worker/disputes" element={<WorkerDisputes />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['cooperative_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/cooperative/dashboard" element={<CooperativeDashboard />} />
          <Route path="/cooperative/workers" element={<CooperativeWorkers />} />
          <Route path="/cooperative/workers/:id" element={<CooperativeWorkerDetail />} />
          <Route path="/cooperative/requests" element={<CooperativeRequests />} />
          <Route path="/cooperative/requests/:id" element={<CooperativeRequestDetail />} />
          <Route path="/cooperative/workforce" element={<SocietyWorkforce />} />
          <Route path="/cooperative/allocations" element={<CooperativeAllocations />} />
          <Route path="/cooperative/performance" element={<CooperativePerformance />} />
          <Route path="/cooperative/demand" element={<CooperativeDemand />} />
          <Route path="/cooperative/disputes" element={<CooperativeDisputes />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['federation_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/federation/dashboard" element={<FederationDashboard />} />
          <Route path="/federation/cooperatives" element={<FederationCooperatives />} />
          <Route path="/federation/demand" element={<FederationDemand />} />
          <Route path="/federation/workforce" element={<FederationWorkforce />} />
          <Route path="/federation/hiring" element={<FederationHiring />} />
          <Route path="/federation/performance" element={<FederationPerformance />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['platform_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Shared cross-role pages: declared once so first-match routing
            never bounces an authorized role to another dashboard. */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['customer', 'worker', 'cooperative_admin', 'federation_admin', 'platform_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/scanner" element={<Scanner />} />
        </Route>
        <Route
          element={
            <ProtectedRoute allowedRoles={['cooperative_admin', 'federation_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/unified-dashboard" element={<UnifiedDashboard />} />
        </Route>
        <Route
          element={
            <ProtectedRoute allowedRoles={['cooperative_admin', 'federation_admin', 'platform_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/workforce/:id" element={<WorkforceDetail />} />
        </Route>
        <Route
          element={
            <ProtectedRoute allowedRoles={['cooperative_admin', 'federation_admin', 'platform_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/requests/:id" element={<CooperativeRequestDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
