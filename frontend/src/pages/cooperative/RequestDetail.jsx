import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, AlertTriangle, Star, ChevronDown, ChevronUp, Loader2, CheckCircle, Sparkles, User } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { useRealtimeSync } from '../../api/realtime';
import ServiceMap from '../../components/ServiceMap';

const UrgencyBadge = ({ urgency }) => {
  const colors = {
    urgent: 'bg-red-100 text-red-700 animate-pulse',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[urgency] || colors.low}`}>
      {urgency}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    allocated: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.pending}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const ScoreBar = ({ label, score, color }) => (
  <div className="flex items-center gap-3">
    <span className="w-24 text-xs text-gray-600">{label}</span>
    <div className="flex-1 bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
    <span className="text-xs font-medium text-gray-900 w-8">{score}%</span>
  </div>
);

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [allocating, setAllocating] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [showAllocateDialog, setShowAllocateDialog] = useState(null);

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/requests/${id}`);
      const payload = response.data?.data || response.data;
      setRequest({
        ...payload,
        serviceName: payload.service_name || `Service #${payload.service_id}`,
        location: payload.location_address || 'Location not provided',
        preferredDate: payload.preferred_date,
        preferredTime: [payload.preferred_time_start, payload.preferred_time_end].filter(Boolean).join(' - '),
        latitude: payload.location_lat,
        longitude: payload.location_lng,
        specialRequirements: payload.special_requirements,
      });
    } catch (err) {
      console.error('Failed to fetch request:', err);
      setError('Failed to load request details');
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  useRealtimeSync({
    tables: ['service_requests', 'allocations', 'bookings', 'notifications'],
    onChange: fetchRequest,
  });

  const getRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      const response = await api.post('/api/matching/recommend', { request_id: id });
      const payload = response.data?.data || response.data;
      const rawRecommendations = payload?.recommendations || payload || [];
      const normalizedRecommendations = rawRecommendations.map((recommendation) => {
        const worker = recommendation.worker || {};
        const breakdown = recommendation.breakdown || {};
        const score = Number(recommendation.score || 0);
        return {
          ...recommendation,
          worker_id: worker.id,
          worker_name: worker.name || 'Worker',
          skills: (worker.skills || []).map((skill) => skill.skill_name || skill.name).filter(Boolean),
          rating: worker.average_rating || 0,
          match_score: Math.round(score * 100),
          score_breakdown: {
            skill_match: Math.round((breakdown.skill || 0) * 100),
            qualification: Math.round((breakdown.qualification || 0) * 100),
            location: Math.round((breakdown.location || 0) * 100),
            availability: Math.round((breakdown.availability || 0) * 100),
            experience: Math.round((breakdown.experience || 0) * 100),
            workload: Math.round((breakdown.workload || 0) * 100),
            rating: Math.round((breakdown.rating || 0) * 100),
          },
        };
      });
      setRecommendations(normalizedRecommendations);
      toast.success('Recommendations loaded successfully');
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      toast.error('Failed to get AI recommendations');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAllocate = async (workerId) => {
    try {
      setAllocating(workerId);
      await api.post('/api/allocations', {
        request_id: id,
        worker_id: workerId,
      });
      toast.success('Worker allocated successfully');
      setShowAllocateDialog(null);
      fetchRequest();
    } catch (err) {
      console.error('Failed to allocate worker:', err);
      toast.error('Failed to allocate worker');
    } finally {
      setAllocating(null);
    }
  };

  const toggleExpanded = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Request not found'}</p>
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
          Back to Requests
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{request.serviceName}</h1>
              <p className="text-gray-600 mt-1">{request.serviceCategory?.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-3">
              <UrgencyBadge urgency={request.urgency} />
              <StatusBadge status={request.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 mt-1">{request.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{request.location}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {request.preferredDate && new Date(request.preferredDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{request.preferredTime}</span>
              </div>
              {request.specialRequirements != null && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Special Requirements</label>
                  <p className="text-gray-900 mt-1">{
                    typeof request.specialRequirements === 'string'
                      ? request.specialRequirements
                      : request.specialRequirements.notes
                        || `${(request.specialRequirements.candidate_rankings || []).length} AI-ranked candidate(s) computed`
                  }</p>
                </div>
              )}
            </div>
          </div>

          {request.latitude && request.longitude && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                Location — request plus recommended workers
              </label>
              <ServiceMap
                height={220}
                center={{ lat: request.latitude, lng: request.longitude }}
                markers={[
                  {
                    lat: request.latitude,
                    lng: request.longitude,
                    label: 'Service request',
                    sub: request.location,
                    kind: 'request',
                  },
                  ...recommendations
                    .filter((rec) => Number.isFinite(rec.worker?.latitude) && Number.isFinite(rec.worker?.longitude))
                    .map((rec) => ({
                      lat: rec.worker.latitude,
                      lng: rec.worker.longitude,
                      label: `${rec.worker_name} (${rec.match_score}% match)`,
                      sub: (rec.skills || []).slice(0, 3).join(', '),
                      kind: 'worker',
                    })),
                ]}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Recommendations
            </h2>
            <button
              onClick={getRecommendations}
              disabled={loadingRecommendations}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingRecommendations ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get AI Recommendations
                </>
              )}
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Matching engine is analyzing candidates...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click "Get AI Recommendations" to find the best workers for this request</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.worker_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {getInitials(rec.worker_name)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{rec.worker_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {rec.skills?.slice(0, 3).map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{rec.match_score}%</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-gray-600">{rec.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAllocateDialog(rec)}
                        disabled={allocating === rec.worker_id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {allocating === rec.worker_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Allocate'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ScoreBar label="Skill Match" score={rec.score_breakdown?.skill_match || 0} color="bg-blue-500" />
                    <ScoreBar label="Qualification" score={rec.score_breakdown?.qualification || 0} color="bg-green-500" />
                    <ScoreBar label="Location" score={rec.score_breakdown?.location || 0} color="bg-purple-500" />
                    <ScoreBar label="Availability" score={rec.score_breakdown?.availability || 0} color="bg-yellow-500" />
                    <ScoreBar label="Experience" score={rec.score_breakdown?.experience || 0} color="bg-orange-500" />
                    <ScoreBar label="Workload" score={rec.score_breakdown?.workload || 0} color="bg-red-500" />
                    <ScoreBar label="Rating" score={rec.score_breakdown?.rating || 0} color="bg-indigo-500" />
                  </div>

                  {rec.explanation && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleExpanded(rec.worker_id)}
                        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                      >
                        Why Recommended?
                        {expandedCards[rec.worker_id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {expandedCards[rec.worker_id] && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {rec.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showAllocateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Allocation</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to allocate <strong>{showAllocateDialog.worker_name}</strong> to this request?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAllocateDialog(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAllocate(showAllocateDialog.worker_id)}
                  disabled={allocating === showAllocateDialog.worker_id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {allocating === showAllocateDialog.worker_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Allocation'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetail;