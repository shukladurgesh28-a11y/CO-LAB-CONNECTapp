/** Shared CO-LAB CONNECT backend shapes (Flask /api/*). Backend is authoritative. */

export type Role = 'customer' | 'worker' | 'cooperative_admin' | 'federation_admin' | 'platform_admin';

export interface User {
  id: number;
  email: string;
  phone: string;
  name: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  base_price?: number;
  category_id: number;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  services: ServiceItem[];
}

export interface Financials {
  service_charges: number;
  material_charges: number;
  commission_amount: number;
  worker_payout: number;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: string;
}

export interface Booking {
  id: number;
  request_id: number;
  worker_id?: number;
  worker_name?: string;
  customer_id: number;
  customer_name?: string;
  cooperative_id: number;
  cooperative_name?: string;
  service_name?: string;
  location_address?: string;
  status: string;
  total_amount?: number;
  final_amount?: number;
  payment_status: string;
  financials?: Financials;
  rating?: { rating: number; feedback?: string } | null;
  created_at?: string;
}

export interface ServiceRequest {
  id: number;
  booking_id?: number;
  status: string;
  service_name?: string;
  location_address?: string;
  urgency?: string;
  created_at?: string;
}

export interface WorkerProfile {
  id: number;
  user_id: number;
  cooperative_id?: number;
  name: string;
  phone: string;
  verification_status: string;
  is_available: boolean;
  experience_years: number;
  average_rating: number;
  total_completed_services: number;
  current_workload: number;
  skills?: { skill_name?: string; proficiency?: string }[];
}

export interface WorkforceRequirement {
  id: number;
  title: string;
  status: string;
  cooperative_name?: string;
  total_worker_types: number;
  total_workers_required: number;
  total_worker_days: number;
  workers_accepted: number;
  workers_remaining: number;
  start_date?: string;
  end_date?: string;
}

export interface WorkforceAssignment {
  id: number;
  requirement_id?: number;
  service_name?: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

export interface WelfareRecord {
  id: number;
  worker_id: number;
  scheme_name?: string;
  enrollment_status?: string;
}

export interface DisputeItem {
  id: number;
  booking_id?: number;
  category: string;
  description: string;
  status: string;
  resolution?: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
}
