import axios from 'axios';

// Production API URL
const api = axios.create({
    baseURL: 'https://n8n-apintegromat.r954jc.easypanel.host',
    // baseURL: 'http://localhost:3000', // Dev URL
});

api.interceptors.request.use((config) => {
    // Add strict API token header
    config.headers['x-api-token'] = '123456'; // HARDCODED FOR MVP AS REQUESTED
    return config;
});

export default api;
