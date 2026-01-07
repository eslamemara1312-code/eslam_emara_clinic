import axios from 'axios';
import { getToken, removeToken } from './utils';

// Dynamically determine API URL
const getApiUrl = () => {
    // 1. Environment Variable (Production) - Recommended for Netlify
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const hostname = window.location.hostname;

    // 2. Localhost or IP
    if (hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        return `http://${hostname}:8001`;
    }

    // 3. Fallback to Cloudflare or HuggingFace if defined manually
    return 'https://smartclinic-v1.hf.space'; 
};

export const API_URL = getApiUrl();
console.log('Using API URL:', API_URL);
console.log('Using API URL:', API_URL);

// Increase timeout to 30 seconds for uploads
export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

// Auth
export const login = (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/token', formData);
};

export const registerClinic = (data) => api.post('/auth/register_clinic', data);
export const getMe = () => api.get('/users/me/');
export const updateProfile = (data) => api.put('/users/me', data);

export default api;

// Add Interceptor for Token
api.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        // Only redirect to login if it's a 401 AND not the login request itself
        if (error.response && error.response.status === 401 && error.config.url !== '/token') {
            removeToken();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Patients
export const searchPatients = (query) => api.get(`/patients/search?q=${query}`);
export const getPatients = () => api.get('/patients/');
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients/', data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

// Appointments
export const getAppointments = () => api.get('/appointments/');
export const createAppointment = (data) => api.post('/appointments/', data);
export const updateAppointmentStatus = (id, status) => api.put(`/appointments/${id}/status?status=${status}`);

// Dental Chart
export const getPatientTeeth = (patientId) => api.get(`/patients/${patientId}/tooth_status`);
export const updateToothStatus = (data) => api.post('/tooth_status/', data);

// Treatments
export const getPatientTreatments = (patientId) => api.get(`/patients/${patientId}/treatments`);
export const createTreatment = (data) => api.post('/treatments/', data);
export const updateTreatment = (id, data) => api.put(`/treatments/${id}`, data);
export const deleteTreatment = (id) => api.delete(`/treatments/${id}`);

// Billing
export const createPayment = (data) => api.post('/payments/', data);
export const getAllPayments = () => api.get('/payments/');
export const getPatientPayments = (patientId) => api.get(`/patients/${patientId}/payments`);
export const getFinancialStats = () => api.get('/finance/stats');
export const deletePayment = (id) => api.delete(`/payments/${id}`);

// Backup
export const downloadBackup = () => api.get('/backup/download', { responseType: 'blob' });
export const uploadBackup = (formData) => api.post('/backup/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

// Procedures
export const getProcedures = () => api.get('/procedures/');
export const createProcedure = (data) => api.post('/procedures/', data);
export const updateProcedure = (id, data) => api.put(`/procedures/${id}`, data);
export const deleteProcedure = (id) => api.delete(`/procedures/${id}`);

// Attachments
export const uploadAttachment = (patientId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/?patient_id=${patientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const getAttachments = (patientId) => api.get(`/patients/${patientId}/attachments`);
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`);

// Expenses
export const getExpenses = () => api.get('/expenses/');
export const createExpense = (data) => api.post('/expenses/', data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Users (Admin)
export const getUsers = () => api.get('/users/');
export const registerUser = (data) => api.post(`/register/?password=${data.password}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Prescriptions
export const getPrescriptions = (patientId) => api.get(`/patients/${patientId}/prescriptions`);
export const createPrescription = (data) => api.post('/prescriptions/', data);
export const deletePrescription = (id) => api.delete(`/prescriptions/${id}`);

// OCR
export const performOCR = (base64Image) => api.post('/ocr/', { base64Image }, { timeout: 60000 });
