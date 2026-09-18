import { apiGet, apiPost } from '@/lib/api';
import type { AppNotification, DisputeItem } from '@/types';

export const submitRating = (bookingId: number, rating: number, feedback?: string) =>
  apiPost('/ratings', { booking_id: bookingId, rating, feedback });
export const getBookingRating = (bookingId: number | string) =>
  apiGet(`/ratings/booking/${bookingId}`);
export const initiatePayment = (bookingId: number, method = 'upi') =>
  apiPost('/payments', { booking_id: bookingId, payment_method: method });
export const getNotifications = () => apiGet<AppNotification[]>('/notifications');
export const markNotificationRead = (id: number) => apiPost(`/notifications/${id}/read`, {});
export const raiseDispute = (input: { booking_id?: number; category: string; description: string }) =>
  apiPost('/disputes', input);
export const getDisputes = () => apiGet<DisputeItem[]>('/disputes');
