// Temporary environment debug file
// Add this to your src folder temporarily to debug build-time env vars

console.log('=== BUILD TIME ENVIRONMENT DEBUG ===');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('All VITE_ vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
console.log('=====================================');

export default null;