import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  CheckCircle,
} from 'lucide-react';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await api.get(`/payments/invoice/${id}`);
        setInvoice(data.invoice || data);
      } catch (err) {
        console.error('Failed to fetch invoice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading invoice..." />;
  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Invoice not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
        >
          <Printer size={16} />
          Print
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      {/* Invoice Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">CO-LAB CONNECT</h1>
              <p className="text-blue-200 text-sm mt-1">Cooperative-Owned Digital Workforce</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">TAX INVOICE</p>
              <p className="text-blue-200 text-sm">Invoice #{invoice.invoice_number || invoice.invoiceNumber || id.slice(-8)}</p>
              <p className="text-blue-200 text-sm">
                Date: {invoice.issued_at || invoice.issuedAt || new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* From / To */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From</h3>
              <p className="font-semibold text-gray-900">CO-LAB CONNECT Cooperative</p>
              <p className="text-sm text-gray-500">Digital Workforce Platform</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">To</h3>
              <p className="font-semibold text-gray-900">{invoice.customer_name || invoice.customer?.name || 'Customer'}</p>
              <p className="text-sm text-gray-500">{invoice.customer_email || invoice.customer?.email || ''}</p>
              <p className="text-sm text-gray-500">{invoice.customer_phone || invoice.customer?.phone || ''}</p>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 font-semibold text-gray-700">Service</th>
                  <th className="text-left py-3 font-semibold text-gray-700">Worker</th>
                  <th className="text-left py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-right py-3 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-900">
                    {invoice.service_name || invoice.service_type || invoice.service?.name || 'Service'}
                  </td>
                  <td className="py-3 text-gray-600">
                    {invoice.worker_name || invoice.worker?.name || '—'}
                  </td>
                  <td className="py-3 text-gray-600">
                    {invoice.service_date || invoice.date || invoice.booking_date || '—'}
                  </td>
                  <td className="py-3 text-right text-gray-900">
                    ₹{(invoice.service_charges || invoice.serviceCharges || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount Breakdown */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Service Charges</span>
                <span>₹{(invoice.service_charges || invoice.serviceCharges || 0).toLocaleString()}</span>
              </div>
              {(invoice.material_charges || invoice.materialCharges || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Material Charges</span>
                  <span>₹{(invoice.material_charges || invoice.materialCharges || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax (GST)</span>
                <span>₹{(invoice.tax || invoice.gst || 0).toLocaleString()}</span>
              </div>
              <div className="border-t-2 border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>₹{(invoice.total_amount || invoice.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
            {invoice.payment_status === 'paid' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle size={18} />
                <span className="font-semibold">Payment Received</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg">
                <FileText size={18} />
                <span className="font-semibold">Payment Pending</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <p className="text-gray-500 text-sm">Thank you for choosing CO-LAB CONNECT</p>
            <p className="text-gray-400 text-xs mt-1">For support, contact us at support@colabconnect.coop</p>
          </div>
        </div>
      </div>
    </div>
  );
}
