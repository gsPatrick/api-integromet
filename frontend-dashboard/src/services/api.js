import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000', // Backend URL
});

api.interceptors.request.use((config) => {
    // Add strict API token header
    config.headers['x-api-token'] = '123456'; // HARDCODED FOR MVP AS REQUESTED
    return config;
});

export default api;
