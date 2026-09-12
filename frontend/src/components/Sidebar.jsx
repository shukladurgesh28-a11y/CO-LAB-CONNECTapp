import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Grid3x3,
  Calendar,
  Clock,
  User,
  Award,
  Briefcase,
  DollarSign,
  Users,
  Inbox,
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  Building2,
  Map,
} from 'lucide-react';

const NAV_CONFIG = {
  customer: [
    { to: '/customer', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/customer/browse', icon: Grid3x3, label: 'Browse Services' },
    { to: '/customer/bookings', icon: Calendar, label: 'My Bookings' },
    { to: '/customer/history', icon: Clock, label: 'History' },
    { to: '/customer/profile', icon: User, label: 'Profile' },
  ],
  worker: [
    { to: '/worker', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/worker/profile', icon: User, label: 'My Profile' },
    { to: '/worker/skills', icon: Award, label: 'Skills' },
    { to: '/worker/availability', icon: Clock, label: 'Availability' },
    { to: '/worker/jobs', icon: Briefcase, label: 'Assigned Jobs' },
    { to: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
    { to: '/worker/history', icon: Clock, label: 'History' },
  ],
  cooperative_admin: [
    { to: '/cooperative', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/cooperative/workers', icon: Users, label: 'Workers' },
    { to: '/cooperative/requests', icon: Inbox, label: 'Request Queue' },
    { to: '/cooperative/allocations', icon: ArrowRightLeft, label: 'Allocations' },
    { to: '/cooperative/performance', icon: BarChart3, label: 'Performance' },
    { to: '/cooperative/analytics', icon: TrendingUp, label: 'Demand Analytics' },
  ],
  federation_admin: [
    { to: '/federation', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/federation/cooperatives', icon: Building2, label: 'Cooperatives' },
    { to: '/federation/demand', icon: Map, label: 'Regional Demand' },
    { to: '/federation/workforce', icon: Briefcase, label: 'Workforce' },
    { to: '/federation/performance', icon: BarChart3, label: 'Performance' },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV_CONFIG[user?.role] || NAV_CONFIG.customer;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[260px] bg-slate-800 z-50 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">CC</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            CO-LAB CONNECT
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-3 bg-slate-700/50 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {user?.name
                  ?.split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '??'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
