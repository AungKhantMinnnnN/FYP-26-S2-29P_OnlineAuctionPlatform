import axios, { type AxiosInstance } from 'axios';

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    // Session lives in an httpOnly cookie (unreadable by JS), so it can't be attached
    // as an Authorization header -- withCredentials sends/accepts it automatically instead.
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const url: string = error.config?.url ?? '';
      // Both endpoints return 401 as their normal "not logged in" response, not an
      // expired session, so they shouldn't trigger the redirect below.
      const isExemptRequest = url.includes('/auth/login') || url.includes('/auth/get_current_user');
      if (error.response?.status === 401 && !isExemptRequest) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const apiClient = createClient(
  import.meta.env.VITE_API_URL || 'http://localhost:8000/v1.0.0'
);

export const recsClient = createClient(
  import.meta.env.VITE_RECS_URL || 'http://localhost:8002/v1.0.0'
);

export const biddingClient = createClient(
  import.meta.env.VITE_BIDDING_URL || 'http://localhost:8001/v1.0.0'
);

export default apiClient;
