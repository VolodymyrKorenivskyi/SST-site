import axios from 'axios';

// Використовуємо відносний шлях, щоб Vite proxy міг працювати
// У продакшені можна використовувати повний URL через змінну середовища
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для додавання session ID з cookie
apiClient.interceptors.request.use(
  (config) => {
    // Встановлюємо credentials для відправки cookies
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обробки помилок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Якщо 401 - можна очистити токен або перенаправити на login
    if (error.response?.status === 401) {
      // Можна додати логіку перенаправлення на login
    }
    
    return Promise.reject(error);
  }
);
