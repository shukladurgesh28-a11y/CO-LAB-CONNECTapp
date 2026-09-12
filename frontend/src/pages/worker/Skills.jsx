import { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Wrench,
  Shield,
  Calendar,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'expert'];
const SKILL_OPTIONS = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Landscaping',
  'HVAC',
  'Masonry',
  'Welding',
  'Roofing',
  'Flooring',
  'Tiling',
  'Appliance Repair',
  'Pest Control',
  'General Maintenance',
];

function ProficiencyBadge({ level }) {
  const styles = {
    beginner: 'bg-blue-100 text-blue-700',
    intermediate: 'bg-orange-100 text-orange-700',
    expert: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[level] || styles.beginner}`}>
      {level}
    </span>
  );
}

function CertStatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    verified: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    expiring_soon: 'bg-orange-100 text-orange-700',
  };
  const icons = {
    active: CheckCircle,
    verified: CheckCircle,
    expired: AlertCircle,
    pending: Clock,
    expiring_soon: AlertCircle,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      <Icon className="w-3 h-3" />
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function Skills() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [savingCert, setSavingCert] = useState(false);

  const [newSkill, setNewSkill] = useState({
    name: '',
    proficiency: 'beginner',
    yearsOfExperience: '',
  });

  const [newCert, setNewCert] = useState({
    name: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/workers/me/profile');
      setProfile(res.data?.data || res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.name) {
      toast.error('Please select a skill');
      return;
    }
    if (!profile?.id) return;
    setSavingSkill(true);
    try {
      await api.post(`/api/workers/${profile.id}/skills`, {
        name: newSkill.name,
        proficiency: newSkill.proficiency,
        yearsOfExperience: Number(newSkill.yearsOfExperience) || 0,
      });
      toast.success('Skill added successfully');
      setShowSkillModal(false);
      setNewSkill({ name: '', proficiency: 'beginner', yearsOfExperience: '' });
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add skill');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleAddCert = async (e) => {
    e.preventDefault();
    if (!newCert.name || !newCert.issuingAuthority) {
      toast.error('Please fill in required fields');
      return;
    }
    if (!profile?.id) return;
    setSavingCert(true);
    try {
      await api.post(`/api/workers/${profile.id}/certifications`, {
        name: newCert.name,
        issuingAuthority: newCert.issuingAuthority,
        issueDate: newCert.issueDate || undefined,
        expiryDate: newCert.expiryDate || undefined,
      });
      toast.success('Certification added successfully');
      setShowCertModal(false);
      setNewCert({ name: '', issuingAuthority: '', issueDate: '', expiryDate: '' });
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add certification');
    } finally {
      setSavingCert(false);
    }
  };

  const skills = profile?.skills || [];
  const certifications = profile?.certifications || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Skills & Certifications</h1>

      {/* Skills Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Skills
          </h2>
          <button
            onClick={() => setShowSkillModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>

        {skills.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No skills added yet. Add your first skill to get started.</p>
        ) : (
          <div className="space-y-3">
            {skills.map((skill, index) => (
              <div
                key={skill._id || index}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <ProficiencyBadge level={skill.proficiency} />
                      {skill.yearsOfExperience > 0 && (
                        <span>{skill.yearsOfExperience} yrs exp.</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {skill.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Unverified</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certifications Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Certifications
          </h2>
          <button
            onClick={() => setShowCertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>

        {certifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No certifications added yet. Add your certifications to boost your profile.
          </p>
        ) : (
          <div className="space-y-3">
            {certifications.map((cert, index) => (
              <div
                key={cert._id || index}
                className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{cert.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cert.issuingAuthority}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {cert.issueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Issued: {new Date(cert.issueDate).toLocaleDateString()}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CertStatusBadge status={cert.status || (cert.isVerified ? 'verified' : 'pending')} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Skill</h3>
              <button
                onClick={() => setShowSkillModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddSkill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Skill</label>
                <select
                  value={newSkill.name}
                  onChange={(e) => setNewSkill((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a skill</option>
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Proficiency</label>
                <select
                  value={newSkill.proficiency}
                  onChange={(e) => setNewSkill((prev) => ({ ...prev, proficiency: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {PROFICIENCY_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={newSkill.yearsOfExperience}
                  onChange={(e) => setNewSkill((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. 3"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSkill}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingSkill && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Certification</h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddCert} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Certification Name *
                </label>
                <input
                  type="text"
                  value={newCert.name}
                  onChange={(e) => setNewCert((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Licensed Electrician"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Issuing Authority *
                </label>
                <input
                  type="text"
                  value={newCert.issuingAuthority}
                  onChange={(e) => setNewCert((prev) => ({ ...prev, issuingAuthority: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. State Licensing Board"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Date</label>
                  <input
                    type="date"
                    value={newCert.issueDate}
                    onChange={(e) => setNewCert((prev) => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={newCert.expiryDate}
                    onChange={(e) => setNewCert((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCert}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCert && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
