import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8000/api'; // Change for real device testing

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const authData = await AsyncStorage.getItem('@JobHub:auth');
  if (authData) {
    const { token } = JSON.parse(authData);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
};

export const jobsService = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (jobData) => api.post('/jobs', jobData),
};

export const applicationsService = {
  apply: (jobId, coverLetter) => api.post('/applications', { job_id: jobId, cover_letter: coverLetter }),
  getMyApplications: () => api.get('/applications/my-applications'),
};

export default api;
