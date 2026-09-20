import { Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { lazy, Suspense, useState } from 'react';
import NotificationBell from './components/NotificationBell';
import { PageFade } from './motion/primitives';

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

const ROLE_META = {
  customer: { brand: 'Customer Space', context: 'Find & track services' },
  worker: { brand: 'Worker Space', context: 'Jobs & earnings' },
  cooperative_admin: { brand: 'Society Console', context: 'Workforce command' },
  federation_admin: { brand: 'Federation Console', context: 'Network oversight' },
  platform_admin: { brand: 'Platform Ops', context: 'System administration' },
};

function SidebarLink({ to, icon, label, collapsed, dark }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      className={`cc-navlink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm ${
        collapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
          : dark
            ? 'text-indigo-100/70 hover:bg-white/10 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
    </Link>
  );
}

function navForRole(role, t) {
  switch (role) {
    case 'customer':
      return [
        { title: 'Workspace', links: [
          { to: '/customer/dashboard', icon: '🏠', label: t('nav.dashboard') },
          { to: '/customer/services', icon: '🔧', label: t('nav.services') },
          { to: '/customer/request', icon: '📝', label: t('customer.requestService') },
          { to: '/customer/bookings', icon: '📅', label: t('nav.bookings') },
          { to: '/customer/history', icon: '📜', label: t('nav.history') },
        ]},
        { title: 'Account', links: [
          { to: '/scanner', icon: '📷', label: 'QR Scanner' },
          { to: '/customer/disputes', icon: '⚠️', label: 'Disputes' },
          { to: '/customer/profile', icon: '👤', label: t('nav.profile') },
        ]},
      ];
    case 'worker':
      return [
        { title: 'Workspace', links: [
          { to: '/worker/dashboard', icon: '🏠', label: t('nav.dashboard') },
          { to: '/worker/jobs', icon: '📋', label: t('nav.assignedJobs') },
          { to: '/worker/earnings', icon: '💰', label: t('nav.earnings') },
          { to: '/worker/history', icon: '📜', label: t('nav.history') },
        ]},
        { title: 'Operations', links: [
          { to: '/worker/skills', icon: '🛠️', label: t('nav.skills') },
          { to: '/worker/availability', icon: '📅', label: t('nav.availability') },
          { to: '/scanner', icon: '📷', label: 'QR Scanner' },
        ]},
        { title: 'Account', links: [
          { to: '/worker/disputes', icon: '⚠️', label: 'Disputes' },
          { to: '/worker/profile', icon: '👤', label: t('nav.profile') },
        ]},
      ];
    case 'cooperative_admin':
      return [
        { title: 'Workspace', links: [
          { to: '/unified-dashboard', icon: '🏛️', label: 'Command Center' },
          { to: '/cooperative/dashboard', icon: '📊', label: t('nav.dashboard') },
        ]},
        { title: 'Operations', links: [
          { to: '/cooperative/requests', icon: '📥', label: t('nav.requests') },
          { to: '/cooperative/allocations', icon: '🔗', label: t('nav.allocations') },
          { to: '/cooperative/workers', icon: '👷', label: t('nav.workers') },
          { to: '/cooperative/workforce', icon: '👥', label: 'Workforce' },
          { to: '/cooperative/performance', icon: '📈', label: t('nav.performance') },
          { to: '/cooperative/demand', icon: '📉', label: t('nav.demand') },
        ]},
        { title: 'Account', links: [
          { to: '/scanner', icon: '📷', label: 'QR Scanner' },
          { to: '/cooperative/disputes', icon: '⚠️', label: 'Disputes' },
        ]},
      ];
    case 'federation_admin':
      return [
        { title: 'Workspace', links: [
          { to: '/unified-dashboard', icon: '🏛️', label: 'Command Center' },
          { to: '/federation/dashboard', icon: '📊', label: t('nav.dashboard') },
        ]},
        { title: 'Operations', links: [
          { to: '/federation/cooperatives', icon: '🏢', label: t('federation.cooperativeManagement') },
          { to: '/federation/workforce', icon: '👷', label: t('nav.workforce') },
          { to: '/federation/hiring', icon: '👥', label: 'Workforce Needs' },
          { to: '/federation/demand', icon: '📈', label: t('federation.regionalDemand') },
          { to: '/federation/performance', icon: '📉', label: t('nav.performance') },
        ]},
        { title: 'Account', links: [
          { to: '/scanner', icon: '📷', label: 'QR Scanner' },
        ]},
      ];
    default:
      return [
        { title: 'Workspace', links: [
          { to: '/admin', icon: '🛡️', label: 'Admin Panel' },
        ]},
        { title: 'Account', links: [
          { to: '/scanner', icon: '📷', label: 'QR Scanner' },
        ]},
      ];
  }
}

function GroupedNav({ groups, collapsed, dark }) {
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title}>
          {!collapsed && <p className="cc-nav-group px-3.5 mb-1.5">{g.title}</p>}
          <div className="flex flex-col gap-1">
            {g.links.map((l) => (
              <SidebarLink key={l.to} to={l.to} icon={l.icon} label={l.label} collapsed={collapsed} dark={dark} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function RouteMotion() {
  const location = useLocation();
  return (
    <PageFade k={location.pathname}>
      <Outlet />
    </PageFade>
  );
}

const PROFILE_ROUTE = {
  customer: '/customer/profile',
  worker: '/worker/profile',
};

function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cc-sidebar') === 'collapsed');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const role = user?.role || 'customer';
  const meta = ROLE_META[role] || ROLE_META.customer;
  const opsRole = ['cooperative_admin', 'federation_admin', 'platform_admin'].includes(role);
  const crumbs = location.pathname.split('/').filter(Boolean).slice(-2);

  const toggleCollapse = () => {
    setCollapsed((v) => {
      localStorage.setItem('cc-sidebar', v ? 'expanded' : 'collapsed');
      return !v;
    });
  };

  return (
    <div className="cc-shell cc-page min-h-screen" data-role={role}>
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu"
            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
          <button onClick={toggleCollapse} aria-label="Toggle sidebar"
            className="hidden md:flex p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Collapse sidebar">
            <span className="text-base leading-none">{collapsed ? '»' : '«'}</span>
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)' }}>
              CC
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="font-extrabold text-gray-900">{t('common.appName')}</p>
              <p className="text-[11px] text-gray-500">{meta.brand}</p>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1.5 ml-4 text-xs text-gray-400" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                <span className={i === crumbs.length - 1 ? 'text-gray-700 font-semibold capitalize' : 'capitalize'}>
                  {c.replace(/-/g, ' ')}
                </span>
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/scanner"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors border border-indigo-200/60"
            title="Open QR Scanner"
          >
            <span>📷</span>
            <span className="hidden sm:inline">QR Scanner</span>
          </Link>
          <NotificationBell />
          <div className="relative">
            <button onClick={() => setAvatarOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-1 sm:pr-2 py-1 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Account menu" aria-expanded={avatarOpen}>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                {(user?.name || user?.email || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden md:block text-left leading-tight">
                <span className="block text-xs font-semibold text-gray-900 max-w-[110px] truncate">{user?.name || user?.email}</span>
                <span className="block text-[10px] text-gray-500 capitalize">{role.replace(/_/g, ' ')}</span>
              </span>
            </button>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
                <div className="cc-drop absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1.5">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  {PROFILE_ROUTE[role] && (
                    <Link to={PROFILE_ROUTE[role]} onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {t('nav.profile')}
                    </Link>
                  )}
                  <button onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
                    {t('common.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex">
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 z-30" />
        )}
        <aside
          className={`${menuOpen ? 'flex fixed inset-y-0 left-0 z-40 pt-[65px]' : 'hidden'} md:flex ${
            collapsed ? 'md:w-[76px]' : 'md:w-64'
          } ${opsRole ? 'cc-side-dark' : 'cc-side-light'} border-r border-gray-200 min-h-[calc(100vh-57px)] p-3 md:sticky md:top-[57px] transition-[width] duration-200`}
          onClick={() => setMenuOpen(false)}>
          <div className={`w-full ${collapsed ? 'md:px-0' : ''}`}>
            {!collapsed && (
              <div className="px-3.5 pt-1 pb-3 md:hidden lg:block">
                <p className={`text-sm font-extrabold ${opsRole ? 'text-white' : 'text-gray-900'}`}>{meta.brand}</p>
                <p className={`text-[11px] ${opsRole ? 'text-indigo-200/70' : 'text-gray-400'}`}>{meta.context}</p>
              </div>
            )}
            <GroupedNav groups={navForRole(role, t)} collapsed={collapsed} dark={opsRole} />
          </div>
        </aside>
        <main className="flex-1 px-4 py-5 sm:p-7 overflow-auto min-w-0 max-w-[1400px] w-full mx-auto">
          <Suspense fallback={<LoadingSpinner />}>
            <RouteMotion />
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
