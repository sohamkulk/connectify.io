import axios from "axios";


const BACKEND = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const api = axios.create({
  baseURL: `${BACKEND}/api`,
  withCredentials: true,
});

export default api;