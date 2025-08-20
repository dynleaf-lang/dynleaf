import api from '../../utils/api';

// Build query string from params
const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  return qs.toString() ? `?${qs.toString()}` : '';
};

export const PurchasesAPI = {
  list: async ({ restaurantId, branchId, limit } = {}) => {
    const query = buildQuery({ restaurantId, branchId, limit });
    const { data } = await api.get(`/public/purchases${query}`);
    return data.purchases || [];
  },
  create: async (payload) => {
    const { data } = await api.post('/public/purchases', payload);
    return data.purchase;
  },
};
