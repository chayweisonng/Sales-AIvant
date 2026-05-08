import axios from 'axios';
import { setAccessToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest = url.includes('/api/auth/');
      if (!isAuthRequest) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired', {
          detail: { message: 'Your session has expired. Please log in again.' }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
