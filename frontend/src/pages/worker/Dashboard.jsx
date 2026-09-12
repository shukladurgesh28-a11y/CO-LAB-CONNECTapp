import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  DollarSign,
  Star,
  User,
  Clock,
  MapPin,
  ArrowRight,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  ChevronRight,
  Wrench,
  FileText,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

function StatsCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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
    const newStatus = profile.isAvailable ? 'offline' : 'available';
    setTogglingAvailability(true);
    try {
      await api.put(`/api/workers/${profile.id}`, { is_available: !profile.isAvailable });
      setProfile((prev) => ({ ...prev, isAvailable: !prev.isAvailable }));
      toast.success(`You are now ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const workerName = profile?.name || user?.name || 'Worker';
  const activeJobs = bookings.filter((b) =>
    ['confirmed', 'accepted', 'en_route', 'service_started', 'in_progress'].includes(b.status)
  );
  const completedJobs = bookings.filter((b) => b.status === 'completed');
  const upcomingJobs = bookings
    .filter((b) => ['confirmed', 'en_route'].includes(b.status))
    .slice(0, 3);
  const recentCompletions = completedJobs.slice(0, 3);

  const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.final_amount || b.total_amount || b.totalAmount || b.amount || 0), 0);
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyEarnings = completedJobs
    .filter((b) => {
      const d = new Date(b.completedAt || b.updatedAt || b.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, b) => sum + (b.final_amount || b.total_amount || b.totalAmount || b.amount || 0), 0);

  const avgRating =
    completedJobs.length > 0
      ? (
          completedJobs.reduce((sum, b) => sum + (b.rating || 0), 0) /
          completedJobs.filter((b) => b.rating).length || 0
        ).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Hello, {workerName} 👋
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              profile?.isVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {profile?.isVerified ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {profile?.isVerified ? 'Verified Worker' : 'Unverified'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Briefcase}
          label="Active Jobs"
          value={activeJobs.length}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatsCard
          icon={CheckCircle}
          label="Completed"
          value={completedJobs.length}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatsCard
          icon={DollarSign}
          label="This Month Earnings"
          value={`$${monthlyEarnings.toFixed(2)}`}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatsCard
          icon={Star}
          label="Rating"
          value={avgRating}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Availability Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                profile?.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <div>
              <h3 className="font-semibold text-gray-900">Current Availability</h3>
              <p className="text-sm text-gray-500">
                {profile?.isAvailable ? 'You are available for new jobs' : 'You are currently offline'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={togglingAvailability}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              profile?.isAvailable ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                profile?.isAvailable ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-sm font-medium">
          {profile?.isAvailable ? (
            <span className="text-green-600">Available</span>
          ) : (
            <span className="text-gray-500">Offline</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Assignments</h3>
            <Link
              to="/worker/jobs"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {upcomingJobs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No upcoming assignments</p>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <Link
                  key={job._id}
                  to={`/worker/jobs/${job._id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {job.serviceName || job.service?.name || 'Service'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.scheduledDate || job.date || job.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.customerArea || job.area || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {job.status === 'confirmed' ? 'Confirmed' : 'En Route'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Completions</h3>
            <Link
              to="/worker/history"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {recentCompletions.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No completed jobs yet</p>
          ) : (
            <div className="space-y-3">
              {recentCompletions.map((job) => (
                <Link
                  key={job._id}
                  to={`/worker/jobs/${job._id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {job.serviceName || job.service?.name || 'Service'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.completedAt || job.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.customerArea || job.area || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-green-600">
                        ${(job.totalAmount || job.amount || 0).toFixed(2)}
                      </span>
                      {job.rating > 0 && (
                        <div className="flex items-center gap-0.5 mt-1 justify-end">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-gray-600">{job.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/worker/profile"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900 block">My Profile</span>
              <span className="text-sm text-gray-500">View & edit profile</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>

          <Link
            to="/worker/availability"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900 block">Update Availability</span>
              <span className="text-sm text-gray-500">Set your schedule</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>

          <Link
            to="/worker/earnings"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900 block">View Earnings</span>
              <span className="text-sm text-gray-500">Track your income</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
}
