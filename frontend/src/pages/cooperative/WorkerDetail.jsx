import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Mail, Phone, Briefcase, Award, Calendar, Clock, CheckCircle, XCircle, MapPin, Wrench, TrendingUp, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

const StatusBadge = ({ status, large = false }) => {
  const colors = {
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    active: 'bg-purple-100 text-purple-700',
    scheduled: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full font-medium ${large ? 'px-4 py-2 text-sm' : 'text-xs'} ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const SkillRow = ({ skill }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="py-3 px-4 text-sm font-medium text-gray-900">{skill.name}</td>
    <td className="py-3 px-4 text-sm text-gray-600">{skill.proficiency}</td>
    <td className="py-3 px-4 text-sm text-gray-600">{skill.experience}</td>
    <td className="py-3 px-4">
      <StatusBadge status={skill.verified ? 'verified' : 'pending'} />
    </td>
  </tr>
);

const CertificationCard = ({ cert, onVerify, onReject }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{cert.name}</h4>
        <p className="text-sm text-gray-600 mt-1">{cert.issuingAuthority}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>Issued: {new Date(cert.issuedDate).toLocaleDateString()}</span>
          {cert.expiryDate && (
            <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={cert.verified ? 'verified' : 'pending'} />
        {!cert.verified && (
          <div className="flex gap-1">
            <button
              onClick={() => onVerify(cert.id)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject(cert.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ScheduleSlot = ({ day, slots }) => (
  <div className="flex items-center gap-3">
    <span className="w-24 text-sm font-medium text-gray-900">{day}</span>
    <div className="flex-1 flex gap-2">
      {slots.map((slot, index) => (
        <span
          key={index}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            slot.available
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {slot.time}
        </span>
      ))}
    </div>
  </div>
);

const WorkerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [worker, setWorker] = useState(null);
  const [welfareRecords, setWelfareRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchWorker();
  }, [id]);

  const fetchWorker = async () => {
    try {
      setLoading(true);
      const [response, welfareResponse] = await Promise.all([
        api.get(`/api/workers/${id}`),
        api.get('/api/welfare', { params: { worker_id: id } }),
      ]);
      setWorker(response.data?.data || response.data);
      setWelfareRecords(welfareResponse.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch worker:', err);
      setError('Failed to load worker details');
      toast.error('Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (status) => {
    try {
      setVerifying(true);
      await api.post(`/cooperative/workers/verify/${id}`, {
        action: status === 'verified' ? 'verify' : 'reject',
      });
      toast.success(`Worker ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
      fetchWorker();
    } catch (err) {
      console.error('Failed to verify worker:', err);
      toast.error('Failed to update worker status');
    } finally {
      setVerifying(false);
    }
  };

  const handleCertVerify = async (certId) => {
    try {
      await api.patch(`/api/cooperative/certifications/verify/${certId}`, { verified: true });
      toast.success('Certification verified successfully');
      fetchWorker();
    } catch (err) {
      console.error('Failed to verify certification:', err);
      toast.error('Failed to verify certification');
    }
  };

  const handleCertReject = async (certId) => {
    try {
      await api.patch(`/api/cooperative/certifications/verify/${certId}`, { verified: false });
      toast.success('Certification rejected');
      fetchWorker();
    } catch (err) {
      console.error('Failed to reject certification:', err);
      toast.error('Failed to reject certification');
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Worker not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">
                  {getInitials(worker.name)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
                <p className="text-gray-600">{worker.cooperativeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={worker.verificationStatus} large />
              {worker.verificationStatus === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify('verified')}
                    disabled={verifying}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Verify
                  </button>
                  <button
                    onClick={() => handleVerify('rejected')}
                    disabled={verifying}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Welfare & Coverage</h2>
          {welfareRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">No welfare records available</p>
          ) : (
            <div className="space-y-3">
              {welfareRecords.map((record) => (
                <div key={record.id} className="rounded-lg bg-gray-50 p-4">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-gray-900">{record.scheme_name || 'Welfare scheme'}</span>
                    <StatusBadge status={record.enrollment_status} />
                  </div>
                  {record.provider && <p className="mt-1 text-sm text-gray-600">Provider: {record.provider}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              Contact
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{worker.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{worker.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-gray-400" />
              Performance
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rating</span>
                <span className="font-medium text-gray-900">{worker.rating?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed Services</span>
                <span className="font-medium text-gray-900">{worker.completedServices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Utilization</span>
                <span className={`font-medium ${worker.utilization > 80 ? 'text-green-600' : worker.utilization > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {worker.utilization || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              Workload
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Jobs</span>
                <span className="font-medium text-gray-900">{worker.activeJobs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scheduled</span>
                <span className="font-medium text-gray-900">{worker.scheduledAssignments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Slots</span>
                <span className="font-medium text-gray-900">{worker.availableSlots || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <p className="text-gray-600">{worker.bio || 'No bio provided'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-400" />
            Skills
          </h2>
          {worker.skills?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Skill</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Proficiency</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Experience</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {worker.skills.map((skill, index) => (
                    <SkillRow key={index} skill={skill} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No skills listed</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-400" />
            Certifications
          </h2>
          {worker.certifications?.length > 0 ? (
            <div className="space-y-3">
              {worker.certifications.map((cert) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  onVerify={handleCertVerify}
                  onReject={handleCertReject}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No certifications listed</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Availability
          </h2>
          {worker.availability?.length > 0 ? (
            <div className="space-y-3">
              {worker.availability.map((daySchedule, index) => (
                <ScheduleSlot
                  key={index}
                  day={daySchedule.day}
                  slots={daySchedule.slots}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No availability schedule set</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Service History
          </h2>
          {worker.serviceHistory?.length > 0 ? (
            <div className="space-y-3">
              {worker.serviceHistory.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{service.serviceName}</p>
                    <p className="text-sm text-gray-600">{service.customerName}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={service.status} />
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(service.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No service history</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;