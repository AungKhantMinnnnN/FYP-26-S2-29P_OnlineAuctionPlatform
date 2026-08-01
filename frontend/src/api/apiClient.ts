import axios, { type AxiosInstance } from 'axios';

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    // The session lives in an httpOnly cookie now (see AuthContext) -- unreadable by JS,
    // so it can't be attached as an Authorization header manually. withCredentials makes
    // the browser send/accept it automatically on every request to this origin instead.
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const url: string = error.config?.url ?? '';
      // /auth/login's own failure shouldn't bounce the login page itself, and
      // /auth/get_current_user is what AuthContext now polls on every page load (it can
      // no longer just check "is there a token in storage" -- the cookie isn't readable)
      // to find out whether anyone is logged in at all, so a 401 there is the expected,
      // normal shape of "not logged in," not a session that just expired.
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
