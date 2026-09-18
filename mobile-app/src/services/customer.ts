import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { ServiceCategory, ServiceRequest, Booking } from '@/types';

export const getCatalog = () => apiGet<ServiceCategory[]>('/services/');
export const getRequests = (status = 'all') => apiGet<ServiceRequest[]>(`/requests?status=${status}`);

export interface NewRequest {
  service_id: number;
  description: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  preferred_date?: string;
  preferred_time_start?: string;
  amount?: number;
  urgency?: string;
  special_requirements?: string;
}

export const createRequest = (input: NewRequest) =>
  apiPost<ServiceRequest & { booking_id: number }>('/requests', input);

export const cancelBooking = (id: number) => apiPost(`/bookings/${id}/cancel`, {});
export const updateBookingStatus = (id: number, status: string) =>
  apiPatch(`/bookings/${id}/status`, { status });
