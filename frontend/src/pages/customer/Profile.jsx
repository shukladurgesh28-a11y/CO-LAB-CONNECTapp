import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Edit3,
  Save,
  X,
  Globe,
  Plus,
  MapPin,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { lang, setLanguage, t } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'en',
  });
  const [addresses, setAddresses] = useState([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        language: lang || 'en',
      });
      setAddresses(user.addresses || []);
    }
  }, [user, lang]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', {
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      updateUser(data.user || data);
      setLanguage(form.language);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    setAddresses([...addresses, { address: newAddress }]);
    setNewAddress('');
    setShowAddAddress(false);
  };

  const handleRemoveAddress = (index) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const initials = form.name
    ? form.name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
          >
            <Edit3 size={16} />
            Edit
          </button>
        ) : (
          <button
            onClick={() => { setEditing(false); setForm({ ...form, name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{form.name || 'User'}</h2>
            <p className="text-sm text-gray-500">{form.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!editing}
                className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none transition text-sm ${
                  editing ? 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-600'
                }`}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={!editing}
                className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none transition text-sm ${
                  editing ? 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-600'
                }`}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={!editing}
                placeholder="+91 98765 43210"
                className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none transition text-sm ${
                  editing ? 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-600'
                }`}
              />
            </div>
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe size={14} className="inline mr-1" />
              Language Preference
            </label>
            <select
              name="language"
              value={form.language}
              onChange={handleChange}
              disabled={!editing}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition text-sm bg-white ${
                editing ? 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {editing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-60"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        )}
      </div>

      {/* Service Addresses */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" />
            Service Addresses
          </h2>
          <button
            onClick={() => setShowAddAddress(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {addresses.length === 0 && !showAddAddress ? (
          <p className="text-gray-400 text-sm">No addresses saved yet</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{addr.address || addr}</span>
                <button
                  onClick={() => handleRemoveAddress(i)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddAddress && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              autoFocus
            />
            <button
              onClick={handleAddAddress}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddAddress(false); setNewAddress(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
