import api from '../../utils/api';

// Build query string from params
const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  return qs.toString() ? `?${qs.toString()}` : '';
};

export const InventoryAPI = {
  list: async ({ branchId, restaurantId, q, status, category, isActive } = {}) => {
    const query = buildQuery({ branchId, restaurantId, q, status, category, isActive });
    const { data } = await api.get(`/public/inventory${query}`);
    return data.items || [];
  },

  create: async (payload) => {
    const { data } = await api.post('/public/inventory', payload);
    return data.item;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/public/inventory/${id}`, payload);
    return data.item;
  },

  adjust: async (id, { deltaQty, reason, refOrderId, notes }) => {
    const { data } = await api.post(`/public/inventory/${id}/adjust`, {
      deltaQty: Number(deltaQty),
      reason,
      refOrderId,
      notes,
    });
    return data;
  },

  history: async (id) => {
    const { data } = await api.get(`/public/inventory/${id}/adjustments`);
    return data.adjustments || [];
  },

  recentAdjustments: async ({ branchId, restaurantId, reason, limit } = {}) => {
    const query = buildQuery({ branchId, restaurantId, reason, limit });
    const { data } = await api.get(`/public/inventory/adjustments/recent${query}`);
    return data.adjustments || [];
  },

  // Reports
  getSummary: async ({ branchId, restaurantId, daysUntilExpiry = 7 } = {}) => {
    const query = buildQuery({ branchId, restaurantId, daysUntilExpiry });
    const { data } = await api.get(`/public/inventory/reports/summary${query}`);
    return data;
  },

  getWastageTrends: async ({ branchId, restaurantId, from, to, groupBy = 'day' } = {}) => {
    const query = buildQuery({ branchId, restaurantId, from, to, groupBy });
    const { data } = await api.get(`/public/inventory/reports/wastage-trends${query}`);
    return data;
  },

  getAdjustmentSummary: async ({ branchId, restaurantId, from, to } = {}) => {
    const query = buildQuery({ branchId, restaurantId, from, to });
    const { data } = await api.get(`/public/inventory/reports/adjustments/summary${query}`);
    return data;
  },

  getExpiringSoon: async ({ branchId, restaurantId, daysUntilExpiry = 7 } = {}) => {
    const query = buildQuery({ branchId, restaurantId, daysUntilExpiry });
    const { data } = await api.get(`/public/inventory/reports/expiring-soon${query}`);
    return data.items || [];
  },
};
