import React, { useState } from 'react';
import {
  Scan,
  ShieldCheck,
  QrCode,
  Sparkles,
  Camera,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Clock,
  ArrowRight,
} from 'lucide-react';
import QRScannerModal from '../../components/QRScannerModal';
import { useAuth } from '../../contexts/AuthContext';

export default function Scanner() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCode, setActiveCode] = useState('');
  const [lastVerified, setLastVerified] = useState(null);

  const openWithCode = (code) => {
    setActiveCode(code);
    setModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl text-white p-8 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide text-blue-200 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Cooperative Identity & Service Authenticator
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Digital QR Verification & Check-In
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Instantly authenticate worker credentials, check police verification badges, and scan customer service passes for secure, fraud-free service start and completion.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => openWithCode('')}
              className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2.5 text-sm"
            >
              <Scan className="w-5 h-5 animate-pulse" />
              Launch Live Camera Scanner
            </button>
            <button
              onClick={() => openWithCode('CC-SVC-1')}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold backdrop-blur-md transition-all text-sm flex items-center gap-2 border border-white/10"
            >
              <QrCode className="w-4 h-4 text-blue-300" />
              Quick Test: Booking Pass #1
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: For Workers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4 font-bold">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Worker On-Site Check-In</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              When arriving at customer premises, scan the customer's Service QR code to authenticate arrival and automatically clock in service start time.
            </p>
          </div>
          <button
            onClick={() => openWithCode('CC-SVC-1')}
            className="w-full py-2.5 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Scan Customer Service QR
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: For Customers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-4 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Worker Police Verification</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Verify your assigned worker's official cooperative ID card, active membership, police verification certificate, and community ratings.
            </p>
          </div>
          <button
            onClick={() => openWithCode('CC-WRK-1')}
            className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Scan Worker ID Badge
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: For Society Admins */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mb-4 font-bold">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Society Audit & Dispatch Pass</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Audit in-flight allocations and inspect dispatch parameters by scanning booking tokens or physical job slips issued by the society.
            </p>
          </div>
          <button
            onClick={() => openWithCode('CC-SVC-2')}
            className="w-full py-2.5 px-4 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Audit Allocation Pass
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trust & Security Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-2xl p-6 border border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-950 text-base">Cooperative Cryptographic Proof</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Every QR token is cryptographically bound to the Cooperative Federation database to ensure zero fraud, ghost workers, or unauthorized gig dispatches.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-white/80 px-4 py-2 rounded-xl shadow-sm">
          <span>Active Nodes: 12 Societies</span>
        </div>
      </div>

      {/* Modal instance */}
      <QRScannerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialCode={activeCode}
        onVerified={(data) => setLastVerified(data)}
      />
    </div>
  );
}
