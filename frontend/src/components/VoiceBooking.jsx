import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';

/**
 * Voice AI booking helper (customer end).
 * Uses the browser's built-in speech recognition (no API key, free).
 * It LISTENS, transcribes, extracts booking details and FILLS the form —
 * the customer always reviews and confirms manually (manual flow untouched).
 */
export default function VoiceBooking({ services = [], onFill }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recogRef = useRef(null);

  useEffect(() => () => { try { recogRef.current?.stop(); } catch { /* noop */ } }, []);

  const parseDetails = (text, catalog) => {
    const lower = text.toLowerCase();
    const out = { description: text.trim() };

    // Service: match catalog names/slugs inside the transcript.
    const hit = (catalog || []).find((s) => {
      const names = [s.name, s.slug, ...(s.name || '').split(' ')];
      return names.some((n) => n && n.length > 3 && lower.includes(String(n).toLowerCase()));
    });
    if (hit) {
      out.service_id = String(hit.id);
      if (hit.base_price) out.amount = String(hit.base_price);
    }

    // Amount: "500 rupees", "₹500", "rs 500".
    const amt = lower.match(/(?:₹|rs\.?|rupees?)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?)/);
    if (amt) out.amount = String(amt[1] || amt[2]);

    // Date words.
    const today = new Date();
    const iso = (d) => d.toISOString().split('T')[0];
    if (lower.includes('day after tomorrow')) {
      const d = new Date(today); d.setDate(d.getDate() + 2); out.preferred_date = iso(d);
    } else if (lower.includes('tomorrow')) {
      const d = new Date(today); d.setDate(d.getDate() + 1); out.preferred_date = iso(d);
    } else if (lower.includes('today')) {
      out.preferred_date = iso(today);
    }

    // Urgency.
    if (lower.includes('urgent') || lower.includes('emergency') || lower.includes('asap')) {
      out.urgency = 'urgent';
    } else if (lower.includes('high priority')) {
      out.urgency = 'high';
    }
    return out;
  };

  const toggle = () => {
    if (listening) {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recogRef.current = recog;
    recog.lang = 'en-IN';
    recog.interimResults = true;
    recog.continuous = false;
    recog.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0]?.transcript || '').join(' ').trim();
      setTranscript(text);
      if (e.results[e.results.length - 1]?.isFinal && text) {
        onFill?.(parseDetails(text, services));
      }
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    setTranscript('');
    setListening(true);
    try { recog.start(); } catch { setListening(false); }
  };

  if (!supported) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Sparkles size={16} className="text-purple-600" />
          Voice booking — speak, we fill, you confirm
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            listening ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {listening ? <><MicOff size={16} /> Stop listening</> : <><Mic size={16} /> Speak booking</>}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Try: “Book an electrician tomorrow for 500 rupees, urgent”. Review the filled form before submitting.
      </p>
      {(listening || transcript) && (
        <p className="mt-2 text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border">
          {listening ? '🎙️ Listening…' : 'Heard:'} <span className="font-medium">{transcript}</span>
        </p>
      )}
    </div>
  );
}
