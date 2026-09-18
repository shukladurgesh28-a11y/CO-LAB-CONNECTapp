import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { WelfareRecord, WorkforceAssignment, WorkerProfile } from '@/types';

export const getMyProfile = () => apiGet<WorkerProfile>('/workers/me/profile');
export const setAvailability = (workerId: number, isAvailable: boolean) =>
  apiPut(`/workers/${workerId}`, { is_available: isAvailable });
export const getWelfare = () => apiGet<WelfareRecord[]>('/welfare');

export const respondWorkforceAllocation = (allocationId: number, decision: 'accept' | 'decline') =>
  apiPost(`/workforce/allocations/${allocationId}/${decision}`, {});
export const completeWorkforceAllocation = (allocationId: number) =>
  apiPost(`/workforce/allocations/${allocationId}/complete`, {});
export const getMyAssignments = () => apiGet<WorkforceAssignment[]>('/workforce/my-assignments');
