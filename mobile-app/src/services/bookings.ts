import { apiGet, apiPost } from '@/lib/api';
import type { Booking } from '@/types';

export const getBookings = () => apiGet<Booking[]>('/bookings');
export const getBooking = (id: number | string) => apiGet<Booking>(`/bookings/${id}`);
export const getInvoice = (bookingId: number | string) =>
  apiGet(`/payments/invoice/${bookingId}`);
export const getSettlement = (bookingId: number | string) =>
  apiGet(`/payments/settlement/${bookingId}`);
