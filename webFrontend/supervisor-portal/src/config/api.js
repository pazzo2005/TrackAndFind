import axios from 'axios';

// Since the Vite web portal runs directly inside your laptop's browser,
// it can securely communicate using your machine's standard local loopback port.
const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 5000, // Automatics timeout exception drop after 5 seconds of thread inactivity
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;