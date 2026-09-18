import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { WorkforceRequirement } from '@/types';

export const getRequirements = () => apiGet<WorkforceRequirement[]>('/society/workforce/requirements');
export const getRequirement = (id: number | string) =>
  apiGet(`/society/workforce/requirements/${id}`);
export const createRequirement = (input: Record<string, unknown>) =>
  apiPost('/society/workforce/requirements', input);
export const addRequirementItem = (reqId: number, item: Record<string, unknown>) =>
  apiPost(`/society/workforce/requirements/${reqId}/items`, item);
export const submitRequirement = (reqId: number) =>
  apiPost(`/society/workforce/requirements/${reqId}/submit`, {});
export const getProgress = (reqId: number | string) =>
  apiGet(`/society/workforce/requirements/${reqId}/progress`);
export const allocateRequirementWorker = (itemId: number, workerId: number) =>
  apiPost(`/society/workforce/items/${itemId}/allocate`, { worker_id: workerId });
export const updateRequirement = (reqId: number, patch: Record<string, unknown>) =>
  apiPut(`/society/workforce/requirements/${reqId}`, patch);
export const cancelRequirement = (reqId: number) =>
  apiDelete(`/society/workforce/requirements/${reqId}`);
