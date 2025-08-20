import api from '../../utils/api';

// Build query string from params
const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  return qs.toString() ? `?${qs.toString()}` : '';
};

export const SuppliersAPI = {
  list: async ({ restaurantId, branchId, q, isActive } = {}) => {
    const query = buildQuery({ restaurantId, branchId, q, isActive });
    const { data } = await api.get(`/public/suppliers${query}`);
    return data.suppliers || [];
  },

  get: async (id) => {
    const { data } = await api.get(`/public/suppliers/${id}`);
    return data.supplier;
  },

  create: async (payload) => {
    const { data } = await api.post('/public/suppliers', payload);
    return data.supplier;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/public/suppliers/${id}`, payload);
    return data.supplier;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/public/suppliers/${id}`);
    return data;
  },
};
