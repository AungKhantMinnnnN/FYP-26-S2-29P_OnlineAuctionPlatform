import axios, { type AxiosInstance } from 'axios';

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        sessionStorage.removeItem('token');
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

export default apiClient;
