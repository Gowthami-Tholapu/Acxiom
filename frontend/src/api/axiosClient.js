import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("acxiom_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "An unexpected error occurred.";
    if (error.response) {
      if (typeof error.response.data?.detail === "string") {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data?.detail)) {
        message = error.response.data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      } else if (error.response.status === 401) {
        message = "Session expired or invalid credentials. Please log in.";
      } else if (error.response.status === 403) {
        message = "Access forbidden: You do not have permission for this action.";
      } else if (error.response.status === 404) {
        message = "Requested record not found.";
      } else if (error.response.status === 409) {
        message = "A conflict occurred with existing data.";
      }
    } else if (error.request) {
      message = "Cannot connect to server. Please ensure backend is running.";
    }
    error.userMessage = message;
    return Promise.reject(error);
  }
);

export default api;
