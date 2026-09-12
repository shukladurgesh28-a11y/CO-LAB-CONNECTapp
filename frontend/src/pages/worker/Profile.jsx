import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle,
  Edit3,
  Save,
  X,
  Loader2,
  Award,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [welfareRecords, setWelfareRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    serviceArea: '',
    experience: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [res, welfareRes] = await Promise.all([
        api.get('/api/workers/me/profile'),
        api.get('/api/welfare'),
      ]);
      const data = res.data?.data || res.data;
      setProfile(data);
      setWelfareRecords(welfareRes.data?.data || []);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        serviceArea: data.serviceArea || data.serviceRadius || '',
        experience: data.experience || data.yearsOfExperience || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      await api.put(`/api/workers/${profile.id}`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        service_area_km: Number(formData.serviceArea) || undefined,
        experience_years: Number(formData.experience) || 0,
      });
      setProfile((prev) => ({
        ...prev,
        ...formData,
      }));
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
      serviceArea: profile?.serviceArea || profile?.serviceRadius || '',
      experience: profile?.experience || profile?.yearsOfExperience || '',
    });
    setEditing(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {getInitials(profile?.name)}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
              {profile?.isVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <Briefcase className="w-4 h-4" />
              {profile?.cooperative?.name || profile?.cooperativeName || 'Independent Worker'}
            </p>
          </div>
          <div className="shrink-0">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-gray-400" />
                Full Name
              </span>
            </label>
            {editing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
                {profile?.name || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" />
                Email
              </span>
            </label>
            {editing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
                {profile?.email || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" />
                Phone
              </span>
            </label>
            {editing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
                {profile?.phone || '—'}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-400" />
                Bio
              </span>
            </label>
            {editing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900 min-h-[3rem]">
                {profile?.bio || 'No bio added yet'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-green-600" />
          Service Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                Service Area (km)
              </span>
            </label>
            {editing ? (
              <input
                type="number"
                name="serviceArea"
                value={formData.serviceArea}
                onChange={handleChange}
                min={1}
                max={100}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. 25"
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
                {profile?.serviceArea || profile?.serviceRadius
                  ? `${profile.serviceArea || profile.serviceRadius} km`
                  : '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Experience (Years)
              </span>
            </label>
            {editing ? (
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                min={0}
                max={50}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. 5"
              />
            ) : (
              <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
                {profile?.experience || profile?.yearsOfExperience
                  ? `${profile.experience || profile.yearsOfExperience} years`
                  : '—'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          Location
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
            <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
              {profile?.location?.coordinates?.[1] ||
                profile?.latitude ||
                profile?.location?.lat ||
                '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
            <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900">
              {profile?.location?.coordinates?.[0] ||
                profile?.longitude ||
                profile?.location?.lng ||
                '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Welfare & Coverage</h2>
        {welfareRecords.length === 0 ? (
          <p className="text-sm text-gray-500">No welfare records are available yet.</p>
        ) : (
          <div className="space-y-3">
            {welfareRecords.map((record) => (
              <div key={record.id} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">{record.scheme_name || 'Welfare scheme'}</p>
                  <span className="text-xs font-medium capitalize text-green-700">{record.enrollment_status}</span>
                </div>
                {record.coverage_details && <p className="mt-1 text-sm text-gray-600">{record.coverage_details}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
