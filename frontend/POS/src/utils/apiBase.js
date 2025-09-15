// Centralized API base for POS (Vite env)
export const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  return `${base}/api`;
};
