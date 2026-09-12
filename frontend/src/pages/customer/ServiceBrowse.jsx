import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import ServiceCard from '../../components/ServiceCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Search } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'home_repair', label: 'Home & Repair' },
  { key: 'cleaning', label: 'Cleaning & Household' },
  { key: 'childcare', label: 'Childcare & Care' },
];

export default function ServiceBrowse() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/services/');
        const categories = data?.data || data?.categories || [];
        const allServices = categories.flatMap((category) =>
          (category.services || []).map((service) => ({
            ...service,
            category: category.slug,
            category_name: category.name,
          }))
        );
        setServices(allServices);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      activeCategory === 'all' ||
      s.category === activeCategory ||
      s.category?.toLowerCase().replaceAll('-', '_').includes(activeCategory);
    const matchesSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Browse Services</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <LoadingSpinner message="Loading services..." />
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-16">
          <Search className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No services found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onClick={() => navigate(`/customer/services/${service.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
