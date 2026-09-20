import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  Clock,
  MapPin,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { PageHero, SectionCard, StatTile, Avatar, inr, safeDate } from '../../components/ds';
import { CardSkeleton } from '../../motion/primitives';

const daypart = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        api.get('/api/workers/me/profile'),
        api.get('/api/bookings/'),
      ]);
      const profileData = profileRes.data?.data || profileRes.data;
      setProfile({
        ...profileData,
        isVerified: profileData.verification_status === 'verified',
        isAvailable: profileData.is_available,
      });
      setBookings(bookingsRes.data?.data || bookingsRes.data?.bookings || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    try {
      await api.put(`/api/workers/${profile.id}`, { is_available: !profile.isAvailable });
      setProfile((prev) => ({ ...prev, isAvailable: !prev.isAvailable }));
      toast.success(`You are now ${!profile.isAvailable ? 'available' : 'offline'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  const firstName = (profile?.name || user?.name || 'Worker').split(' ')[0];
  const activeJobs = bookings.filter((b) =>
    ['confirmed', 'accepted', 'en_route', 'service_started', 'in_progress'].includes(b.status)
  );
  const completedJobs = bookings.filter((b) => b.status === 'completed');
  const newRequests = bookings.filter((b) => b.status === 'confirmed');
  const payoutOf = (b) => Number(b.financials?.worker_payout ?? b.final_amount ?? b.total_amount ?? 0);
  const earned = completedJobs.reduce((s, b) => s + payoutOf(b), 0);
  const rated = completedJobs.filter((b) => Number(b.rating) > 0);
  const avgRating = rated.length
    ? (rated.reduce((s, b) => s + Number(b.rating), 0) / rated.length).toFixed(1)
    : '—';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Identity hero: verification + availability in one glance */}
      <section className="cc-enter relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06392f] via-[#046c4e] to-[#10b981] text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute -right-16 -top-20 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={profile?.name || user?.name} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-100/80">{daypart()}, {firstName} 👋</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur">
                {profile?.isVerified ? <CheckCircle size={14} /> : <Clock size={14} />}
                {profile?.isVerified ? 'Verified Worker' : 'Verification pending'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={togglingAvailability}
            aria-pressed={!!profile?.isAvailable}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 ${
              profile?.isAvailable ? 'bg-white text-emerald-700' : 'bg-black/25 text-white border border-white/30'
            }`}
          >
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.isAvailable ? 'bg-emerald-500' : 'bg-white/25'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${profile?.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
            {togglingAvailability ? 'Saving…' : profile?.isAvailable ? 'Available for Jobs' : 'Go Available'}
          </button>
        </div>
        {!profile?.isAvailable && (
          <p className="relative text-xs text-emerald-50/80 mt-3">You are offline — new allocations will skip you until you switch on.</p>
        )}
      </section>

      {/* Today strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="New requests" value={newRequests.length} sub="Awaiting your accept" />
        <StatTile label="Active jobs" value={activeJobs.length} sub="In progress now" />
        <StatTile label="Earned" value={earned} money sub={`${completedJobs.length} completed`} />
        <StatTile label="Rating" value={avgRating} sub={profile?.verification_status || '—'} />
      </div>

      {/* Today's work */}
      <SectionCard
        title="Today's work"
        sub="Newest assignments first — accept to lock them in"
        action={<Link to="/worker/jobs" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">All jobs <ArrowRight size={14} /></Link>}
      >
        {activeJobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="mx-auto text-gray-300 mb-2" size={36} />
            <p className="text-sm font-medium text-gray-900">No active jobs</p>
            <p className="text-xs text-gray-500 mt-1">New allocations from your society will land here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.slice(0, 4).map((job) => (
              <Link
                key={job.id}
                to={`/worker/jobs/${job.id}`}
                className="cc-card cc-card-hover flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white"
              >
                <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0" aria-hidden="true">🔧</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm block truncate">
                    {job.service_name || job.service?.name || 'Service'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <MapPin size={12} />{(job.location_address || 'Location').slice(0, 32)}
                    <Clock size={12} />{safeDate(job.service_date || job.preferred_date)}
                  </span>
                </span>
                <StatusBadge status={job.status} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Earnings + skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Earnings"
          sub="Backend-calculated payouts only"
          action={<Link to="/worker/earnings" className="text-sm font-semibold text-emerald-700">Details</Link>}
        >
          <p className="text-3xl font-extrabold text-gray-900">{inr(earned)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {completedJobs.length} completed jobs • {profile?.experience_years || 0} yrs experience
          </p>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${Math.min(100, completedJobs.length * 10)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Progress to 10-job milestone</p>
        </SectionCard>

        <SectionCard
          title="Skills & standing"
          action={<Link to="/worker/skills" className="text-sm font-semibold text-emerald-700">Manage</Link>}
        >
          <div className="flex flex-wrap gap-2">
            {(profile?.skills || []).slice(0, 6).map((s, i) => (
              <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                {s.skill_name || s.name}
              </span>
            ))}
            {(profile?.skills || []).length === 0 && (
              <p className="text-xs text-gray-400">No skills listed — add them to get matched.</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="font-bold text-gray-900">{avgRating}</span>
            <span className="text-gray-500 text-xs">average rating</span>
            <Zap size={14} className="text-indigo-500 ml-2" />
            <span className="text-xs text-gray-500">Workload {profile?.current_workload || 0}/{profile?.max_workload || 5}</span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
