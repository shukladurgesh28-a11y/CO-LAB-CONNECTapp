import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Zap,
  Tag,
  FileCheck,
  ChevronRight,
} from 'lucide-react';

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data } = await api.get(`/services/${id}`);
        setService(data?.data || data?.service || null);
      } catch (err) {
        console.error('Failed to fetch service:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading service details..." />;
  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-lg">Service not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-indigo-600 font-medium hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const skills = service.required_skills || service.skills || [];
  const qualifications = service.qualifications || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{service.name}</h1>
        {service.category && (
          <span className="inline-block text-xs font-medium bg-white/20 px-3 py-1 rounded-full">
            {service.category}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-gray-600 leading-relaxed">
          {service.description || 'No description available for this service.'}
        </p>
      </div>

      {/* Required Skills */}
      {skills.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag size={18} className="text-indigo-500" />
            Required Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Qualifications */}
      {qualifications.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileCheck size={18} className="text-green-500" />
            Qualifications
          </h2>
          <div className="flex flex-wrap gap-2">
            {qualifications.map((q, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        {service.verification_required && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <Shield size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">Verification Required</span>
          </div>
        )}
        {service.emergency_support && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">Emergency Support</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate(`/customer/request?service=${id}`)}
        className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
      >
        Request This Service
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
