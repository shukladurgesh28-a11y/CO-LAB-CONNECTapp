import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import BookingCard from '../../components/BookingCard';
import { PageHero, SectionCard } from '../../components/ds';
import { CardSkeleton } from '../../motion/primitives';
import { Calendar, Clock, Plus, ArrowRight } from 'lucide-react';

const CATEGORY_ICONS = {
  'home-repair': '🔧', electrical: '💡', plumbing: '🔩', carpentry: '🪚',
  painting: '🎨', cleaning: '🧹', 'cleaning-household': '🧹', gardening: '🌿',
  childcare: '👶', 'childcare-care': '👶', eldercare: '🧓', petcare: '🐾',
  cooking: '🍳', driving: '🚗', beauty: '💅', appliance: '🔌', default: '🛠️',
};

const iconFor = (slug, name) => {
  const key = (slug || '').toLowerCase();
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  const n = (name || '').toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (n.includes(k.replace(/-/g, ' '))) return v;
  }
  return CATEGORY_ICONS.default;
};

const daypart = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, spent: 0, rating: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, historyRes, servicesRes] = await Promise.all([
          api.get('/bookings/'),
          api.get('/history/'),
          api.get('/services/'),
        ]);
        const allBookings = bookingsRes.data?.data || bookingsRes.data?.bookings || [];
        const completed = allBookings.filter((b) => b.status === 'completed');
        const totalSpent = completed.reduce((sum, b) => sum + Number(b.final_amount ?? b.total_amount ?? 0), 0);
        const rated = completed.filter((b) => b.rating);
        const avgRating = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
        setBookings(allBookings);
        setHistory(historyRes.data?.data || historyRes.data?.history || []);
        setCategories(servicesRes.data?.data || servicesRes.data?.categories || []);
        setStats({ total: allBookings.length, completed: completed.length, spent: totalSpent, rating: avgRating });
      } catch {
        /* layout shows empty states; toasts handled by interceptor */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeBookings = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).slice(0, 3);
  const recentActivity = history.slice(0, 4);
  const firstName = (user?.name || 'there').split(' ')[0];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHero
        eyebrow={today}
        title={`${daypart()}, ${firstName} 👋`}
        sub="Verified workers from your cooperative — one tap away."
        cta={[{ to: '/customer/request', label: '+ Request a Service' }, { to: '/customer/bookings', label: 'My Bookings' }]}
        stats={[
          { label: 'Active', value: activeBookings.length },
          { label: 'Completed', value: stats.completed },
          { label: 'Spent', value: stats.spent, countUp: true, format: (v) => `₹${Math.round(v).toLocaleString('en-IN')}` },
          { label: 'Rating', value: stats.rating > 0 ? stats.rating.toFixed(1) : '—' },
        ]}
      />

      {/* Service categories */}
      <SectionCard
        title="Find a service"
        sub="Every category is served by verified cooperative workers"
        action={<Link to="/customer/services" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">All <ArrowRight size={14} /></Link>}
      >
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No service categories yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/customer/services?category=${c.slug}`)}
                className="cc-card cc-card-hover text-left bg-gradient-to-br from-white to-indigo-50/50 border border-gray-100 rounded-2xl p-4"
              >
                <span className="text-3xl" aria-hidden="true">{iconFor(c.slug, c.name)}</span>
                <p className="font-bold text-gray-900 text-sm mt-2">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description || `${(c.services || []).length} services`}</p>
                <span className="text-xs font-semibold text-indigo-600 mt-2 inline-block">Explore →</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active bookings */}
        <SectionCard
          title="Active bookings"
          action={<Link to="/customer/bookings" className="text-sm font-semibold text-indigo-600">View all</Link>}
        >
          {loading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : activeBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-indigo-200 mb-2" size={36} />
              <p className="text-sm text-gray-500">Nothing in progress — request a service to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((b) => (
                <BookingCard key={b.id ?? b._id} booking={b} onClick={() => navigate(`/customer/bookings/${b.id ?? b._id}`)} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent activity */}
        <SectionCard title="Recent activity">
          {loading ? (
            <div className="space-y-3"><CardSkeleton /></div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto text-indigo-200 mb-2" size={36} />
              <p className="text-sm text-gray-500">Your recent services will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentActivity.map((item, i) => (
                <li key={item.id || i} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.service_name || item.service?.name || 'Service'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[item.worker_name, item.completed_at || item.date].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/customer/request')}
          className="cc-card cc-card-hover flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-left shadow-lg shadow-indigo-600/20">
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">+</span>
          <span>
            <span className="font-bold block">Request a Service</span>
            <span className="text-xs text-indigo-100">Electrician, plumber, cleaner & more</span>
          </span>
        </button>
        <button onClick={() => navigate('/customer/history')}
          className="cc-card cc-card-hover flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl text-left">
          <span className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold">✓</span>
          <span>
            <span className="font-bold block text-gray-900">History & Invoices</span>
            <span className="text-xs text-gray-500">Payments, receipts and past workers</span>
          </span>
        </button>
      </div>
    </div>
  );
}
