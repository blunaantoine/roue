const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Campaigns - API returns raw array for list, raw object for get/create/update
export const campaignsApi = {
  list: () => apiFetch<any[]>('/campaigns'),
  get: (id: string) => apiFetch<any>(`/campaigns/${id}`),
  create: (data: any) => apiFetch<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/campaigns/${id}`, { method: 'DELETE' }),
};

// Prizes - API returns raw array for list, raw object for get/create/update
export const prizesApi = {
  list: (campaignId?: string) => apiFetch<any[]>(`/prizes${campaignId ? `?campaignId=${campaignId}` : ''}`),
  get: (id: string) => apiFetch<any>(`/prizes/${id}`),
  create: (data: any) => apiFetch<any>('/prizes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/prizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/prizes/${id}`, { method: 'DELETE' }),
};

// Codes - API returns raw array for list, raw object for get/update, object with count+result for generate
export const codesApi = {
  list: (campaignId?: string, params?: { status?: string; result?: string }) => {
    const queryParams = new URLSearchParams();
    if (campaignId) queryParams.set('campaignId', campaignId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.result) queryParams.set('result', params.result);
    return apiFetch<any[]>(`/codes?${queryParams.toString()}`);
  },
  generate: (data: { campaignId: string; count: number; result: 'winning' | 'losing'; prizeId?: string }) => apiFetch<any>('/codes', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => apiFetch<any>(`/codes/${id}`),
  update: (id: string, data: any) => apiFetch<any>(`/codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  validate: (codeValue: string) => apiFetch<any>('/codes/validate', { method: 'POST', body: JSON.stringify({ codeValue }) }),
};

// Spin - returns result object
export const spinApi = {
  spin: (data: { codeValue: string; participantName?: string; participantPhone?: string }) => apiFetch<any>('/spin', { method: 'POST', body: JSON.stringify(data) }),
};

// Participations - API returns raw array
export const participationsApi = {
  list: (campaignId?: string) => apiFetch<any[]>(`/participations${campaignId ? `?campaignId=${campaignId}` : ''}`),
};

// Contacts - API returns raw array for list, raw object for create
export const contactsApi = {
  list: (campaignId?: string) => apiFetch<any[]>(`/contacts${campaignId ? `?campaignId=${campaignId}` : ''}`),
  create: (data: any) => apiFetch<any>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/contacts?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/contacts?id=${id}`, { method: 'DELETE' }),
};

// Stats - returns stats object
export const statsApi = {
  get: (campaignId: string) => apiFetch<any>(`/stats?campaignId=${campaignId}`),
};

// Promotions - API returns raw array for list, raw object for create
export const promotionsApi = {
  list: (campaignId?: string) => apiFetch<any[]>(`/promotions${campaignId ? `?campaignId=${campaignId}` : ''}`),
  create: (data: any) => apiFetch<any>('/promotions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/promotions/${id}`, { method: 'DELETE' }),
};

// Wheel Config - returns wheelConfig object
export const wheelConfigApi = {
  get: (campaignId: string) => apiFetch<any>(`/wheel-config?campaignId=${campaignId}`),
  update: (campaignId: string, data: any) => apiFetch<any>(`/wheel-config?campaignId=${campaignId}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Admin Logs - API returns raw array
export const adminLogsApi = {
  list: (campaignId?: string) => apiFetch<any[]>(`/admin-logs${campaignId ? `?campaignId=${campaignId}` : ''}`),
  create: (data: any) => apiFetch<any>('/admin-logs', { method: 'POST', body: JSON.stringify(data) }),
};

// Export
export const exportApi = {
  download: (campaignId: string, type: 'codes' | 'participations' | 'contacts', format: 'csv' | 'json' = 'csv') => {
    window.open(`${API_BASE}/export?campaignId=${campaignId}&type=${type}&format=${format}`, '_blank');
  },
};
