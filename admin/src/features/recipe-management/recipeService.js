import api from '../../utils/api';

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  return qs.toString() ? `?${qs.toString()}` : '';
};

export const RecipeAPI = {
  get: async (menuItemId, { restaurantId, branchId } = {}) => {
    const query = buildQuery({ restaurantId, branchId });
    const { data } = await api.get(`/public/recipes/${menuItemId}${query}`);
    return data.recipe || null;
  },
  save: async (menuItemId, payload) => {
    const { data } = await api.put(`/public/recipes/${menuItemId}`, payload);
    return data.recipe;
  }
};
