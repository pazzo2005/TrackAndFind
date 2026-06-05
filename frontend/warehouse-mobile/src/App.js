import axios from 'axios';
const LAPTOP_IP = '10.123.66.60'; // ◄── CHANGE THIS TO YOUR LOCAL IP
const PORT = '8080';

const api = axios.create({
    baseURL: `http://${LAPTOP_IP}:${PORT}/api`,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;