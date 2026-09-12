import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Shield,
  Users,
  Brain,
  CreditCard,
  MapPin,
  BarChart3,
  Zap,
  Droplets,
  Hammer,
  Sparkles,
  Baby,
  PawPrint,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const FEATURES = [
  { icon: Shield, title: 'Cooperative Control', desc: 'The cooperative remains the operational control layer' },
  { icon: Users, title: 'Verified Workers', desc: 'Every worker is registered, verified and skill-profiled' },
  { icon: Brain, title: 'Smart Matching', desc: 'AI-powered multi-factor worker recommendations' },
  { icon: CreditCard, title: 'Digital Payments', desc: 'Secure UPI-compatible digital payments and invoicing' },
  { icon: MapPin, title: 'Service Tracking', desc: 'Real-time booking tracking and status updates' },
  { icon: BarChart3, title: 'Workforce Analytics', desc: 'Demand intelligence and workforce planning' },
];

const STEPS = [
  { label: 'Request', desc: 'Submit your service requirement' },
  { label: 'AI Matching', desc: 'Smart worker recommendation' },
  { label: 'Cooperative Allocation', desc: 'Verified allocation by cooperative' },
  { label: 'Service Delivery', desc: 'Track and complete service' },
];

const SERVICES = [
  { icon: Zap, name: 'Electrician', color: 'from-yellow-400 to-orange-500' },
  { icon: Droplets, name: 'Plumber', color: 'from-blue-400 to-cyan-500' },
  { icon: Hammer, name: 'Carpenter', color: 'from-amber-500 to-orange-600' },
  { icon: Sparkles, name: 'Cleaner', color: 'from-green-400 to-emerald-500' },
  { icon: Baby, name: 'Nanny', color: 'from-pink-400 to-rose-500' },
  { icon: PawPrint, name: 'Pet Care', color: 'from-purple-400 to-indigo-500' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in">
              CO-LAB CONNECT
            </h1>
            <p className="text-xl md:text-2xl font-medium text-blue-100 mb-3">
              Cooperative-Owned Digital Workforce Operating System
            </p>
            <p className="text-base md:text-lg text-blue-200 mb-10">
              Connecting verified workers with households through cooperative governance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3.5 bg-white text-indigo-700 font-semibold rounded-lg shadow-lg hover:bg-blue-50 transition-all duration-200 text-lg"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200 text-lg"
              >
                Login
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why CO-LAB CONNECT?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              A platform built on cooperative principles for fair, verified, and smart workforce management
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <f.icon className="text-indigo-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg">Four simple steps to get your service delivered</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="flex flex-col items-center text-center max-w-[180px]">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl mb-3">
                    {i + 1}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{step.label}</h4>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="text-indigo-300 hidden md:block flex-shrink-0" size={28} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-gray-500 text-lg">Trusted professionals for every household need</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate('/register')}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-3`}>
                  <s.icon className="text-white" size={28} />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm">{s.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to get started?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join the cooperative and experience verified, trustworthy service delivery
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-indigo-700 font-bold rounded-lg shadow-lg hover:bg-blue-50 transition-all duration-200 text-lg inline-flex items-center gap-2"
          >
            Register Now <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">CO-LAB CONNECT</h3>
              <p className="text-sm">Cooperative-Owned Digital Workforce Operating System</p>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="hover:text-white cursor-pointer transition-colors">About</span>
              <span className="hover:text-white cursor-pointer transition-colors">Services</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} CO-LAB CONNECT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
