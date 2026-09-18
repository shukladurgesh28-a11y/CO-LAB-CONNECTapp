import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, Users, CalendarDays, MapPin, Loader2, ArrowLeft, Send } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ServiceMap from '../../components/ServiceMap';

const WORK_TYPES = ['Maintenance', 'Construction', 'Cleaning', 'Repair', 'Event', 'Regular Operations', 'Other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  UNDER_REVIEW: 'bg-orange-100 text-orange-700',
  MATCHING: 'bg-purple-100 text-purple-700',
  PARTIALLY_FULFILLED: 'bg-amber-100 text-amber-800',
  FULLY_FULFILLED: 'bg-blue-100 text-blue-700',
  WORK_IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
  EXPIRED: 'bg-red-100 text-red-600',
};

const blankItem = () => ({
  service_id: '',
  quantity_required: 1,
  skill_requirement: '',
  minimum_experience: 0,
  start_date: '',
  end_date: '',
  working_hours_per_day: 8,
  priority: 'normal',
  special_requirements: '',
  gender_preference: '',
  accommodation_required: false,
  equipment_provided: false,
  notes: '',
});

const daysBetween = (s, e) => {
  if (!s || !e) return 0;
  const d = Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
  return d > 0 ? d : 0;
};

export default function Workforce() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('list');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', work_type: 'Maintenance',
    location_address: '', latitude: null, longitude: null,
    start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '18:00',
  });
  const [items, setItems] = useState([blankItem()]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, svcRes] = await Promise.all([
        api.get('/api/society/workforce/requirements'),
        api.get('/api/services/'),
      ]);
      setRequirements(reqRes.data?.data || []);
      const cats = svcRes.data?.data || svcRes.data?.categories || [];
      setServices(cats.flatMap((c) => (c.services || []).map((s) => ({ ...s, category_name: c.name }))));
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load workforce requirements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const summary = useMemo(() => {
    const rows = items.map((it) => {
      const days = daysBetween(it.start_date || form.start_date, it.end_date || form.end_date);
      const qty = Math.max(0, parseInt(it.quantity_required, 10) || 0);
      return { ...it, days, workerDays: qty * days };
    });
    return {
      rows,
      types: items.length,
      workers: rows.reduce((s, r) => s + (Math.max(0, parseInt(r.quantity_required, 10) || 0)), 0),
      workerDays: rows.reduce((s, r) => s + r.workerDays, 0),
      duration: daysBetween(form.start_date, form.end_date),
    };
  }, [items, form.start_date, form.end_date]);

  const patchItem = (idx, patch) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (idx) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  const duplicateItem = (idx) => setItems((prev) => [...prev, { ...prev[idx] }]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Requirement title is required');
    if (items.length === 0) return toast.error('Add at least one worker requirement');
    setSubmitting(true);
    try {
      const { data: created } = await api.post('/api/society/workforce/requirements', {
        ...form,
        latitude: form.latitude, longitude: form.longitude,
      });
      const reqId = created?.data?.id;
      for (const it of items) {
        await api.post(`/api/society/workforce/requirements/${reqId}/items`, {
          ...it,
          quantity_required: parseInt(it.quantity_required, 10),
          minimum_experience: parseInt(it.minimum_experience, 10) || 0,
          working_hours_per_day: parseFloat(it.working_hours_per_day) || 8,
          start_date: it.start_date || form.start_date || undefined,
          end_date: it.end_date || form.end_date || undefined,
        });
      }
      await api.post(`/api/society/workforce/requirements/${reqId}/submit`);
      toast.success('Workforce requirement submitted to the federation!');
      navigate(`/workforce/${reqId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit requirement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;

  if (mode === 'create') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => setMode('list')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Back to requirements</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Workforce Requirement</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Step 1 — Details &nbsp;•&nbsp; Step 2 — Location & Schedule &nbsp;•&nbsp; Step 3 — Workers &nbsp;•&nbsp; Step 4 — Review & Submit</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Requirement details</h2>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Society Building Renovation" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Work details..." className="w-full px-4 py-2.5 border rounded-lg text-sm" />
            <select value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white">
              {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Location & schedule</h2>
            <input value={form.location_address} onChange={(e) => setForm({ ...form, location_address: e.target.value })}
              placeholder="Work location address" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
            <ServiceMap
              height={220}
              center={form.latitude ? { lat: form.latitude, lng: form.longitude } : undefined}
              onPick={(c) => setForm({ ...form, latitude: c.lat, longitude: c.lng })}
              markers={form.latitude ? [{ lat: form.latitude, lng: form.longitude, label: 'Work site', kind: 'request' }] : []}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-xs text-gray-500">Start<input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
              <label className="text-xs text-gray-500">End<input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
              <label className="text-xs text-gray-500">Day start<input type="time" value={form.daily_start_time}
                onChange={(e) => setForm({ ...form, daily_start_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
              <label className="text-xs text-gray-500">Day end<input type="time" value={form.daily_end_time}
                onChange={(e) => setForm({ ...form, daily_end_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
            </div>
            <p className="text-xs text-gray-500">Project duration: <b>{summary.duration} days</b> (auto-calculated)</p>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Worker requirements ({items.length})</h2>
              <button type="button" onClick={addItem} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Add Worker Type</button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">Worker Requirement #{idx + 1}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => duplicateItem(idx)} title="Duplicate"
                      className="p-1.5 text-gray-500 hover:text-indigo-600"><Copy size={16} /></button>
                    <button type="button" onClick={() => removeItem(idx)} title="Remove"
                      className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <select value={it.service_id} onChange={(e) => patchItem(idx, { service_id: e.target.value })}
                    className="col-span-2 px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Select category *</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>)}
                  </select>
                  <label className="text-xs text-gray-500">Workers*<input type="number" min="1" value={it.quantity_required}
                    onChange={(e) => patchItem(idx, { quantity_required: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
                  <label className="text-xs text-gray-500">Min exp (yrs)<input type="number" min="0" value={it.minimum_experience}
                    onChange={(e) => patchItem(idx, { minimum_experience: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
                  <input value={it.skill_requirement} onChange={(e) => patchItem(idx, { skill_requirement: e.target.value })}
                    placeholder="Required skill" className="px-3 py-2 border rounded-lg text-sm" />
                  <select value={it.priority} onChange={(e) => patchItem(idx, { priority: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm bg-white">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <label className="text-xs text-gray-500">Start<input type="date" value={it.start_date}
                    onChange={(e) => patchItem(idx, { start_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
                  <label className="text-xs text-gray-500">End<input type="date" value={it.end_date}
                    onChange={(e) => patchItem(idx, { end_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
                  <label className="text-xs text-gray-500">Hrs/day<input type="number" min="1" max="24" step="0.5" value={it.working_hours_per_day}
                    onChange={(e) => patchItem(idx, { working_hours_per_day: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" /></label>
                  <input value={it.special_requirements} onChange={(e) => patchItem(idx, { special_requirements: e.target.value })}
                    placeholder="Special requirements" className="col-span-2 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.accommodation_required}
                    onChange={(e) => patchItem(idx, { accommodation_required: e.target.checked })} /> Accommodation required</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.equipment_provided}
                    onChange={(e) => patchItem(idx, { equipment_provided: e.target.checked })} /> Tools provided</label>
                  <span className="ml-auto font-semibold">{summary.rows[idx]?.workerDays || 0} worker-days</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-950 text-white rounded-xl p-6">
            <h2 className="font-bold mb-3">Workforce requirement summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div><div className="text-2xl font-extrabold">{summary.types}</div><div className="text-xs text-indigo-200">Worker types</div></div>
              <div><div className="text-2xl font-extrabold">{summary.workers}</div><div className="text-xs text-indigo-200">Workers required</div></div>
              <div><div className="text-2xl font-extrabold">{summary.workerDays}</div><div className="text-xs text-indigo-200">Total worker-days</div></div>
              <div><div className="text-2xl font-extrabold">{summary.duration}</div><div className="text-xs text-indigo-200">Project days</div></div>
            </div>
            <table className="w-full mt-4 text-xs">
              <thead><tr className="text-indigo-300 text-left"><th className="py-1">Worker type</th><th>Workers</th><th>Duration</th><th>Experience</th></tr></thead>
              <tbody>
                {summary.rows.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="py-1.5 font-medium">{services.find((s) => String(s.id) === String(r.service_id))?.name || '—'}</td>
                    <td>{r.quantity_required}</td><td>{r.days} days</td><td>{r.minimum_experience}+ yrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={18} /> {submitting ? 'Submitting...' : 'Review & Submit to Federation'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce Requirements</h1>
          <p className="text-sm text-gray-500">Bulk hiring from your federation worker pool</p>
        </div>
        <button onClick={() => setMode('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
          <Plus size={16} /> New Requirement
        </button>
      </div>
      {requirements.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          No workforce requirements yet. Create one for your next project.
        </div>
      ) : (
        <div className="grid gap-4">
          {requirements.map((r) => (
            <button key={r.id} onClick={() => navigate(`/workforce/${r.id}`)}
              className="bg-white rounded-xl border p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900">#{r.id} — {r.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{r.start_date} → {r.end_date}</span>
                    {r.location_address && <span className="inline-flex items-center gap-1"><MapPin size={12} />{r.location_address}</span>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[r.status] || STATUS_STYLES.DRAFT}`}>
                  {r.status?.replaceAll('_', ' ')}
                </span>
              </div>
              <div className="flex gap-5 mt-3 text-xs text-gray-600">
                <span><b>{r.total_workers_required}</b> workers</span>
                <span><b>{r.workers_accepted}</b> accepted</span>
                <span><b>{r.workers_remaining}</b> remaining</span>
                <span><b>{r.total_worker_days}</b> worker-days</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
