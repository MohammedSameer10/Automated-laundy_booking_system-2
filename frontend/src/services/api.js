const API_BASE = '/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getProfile() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    logout() {
        this.setToken(null);
    }

    // Services endpoints
    async getServices() {
        return this.request('/services');
    }

    async getServicesByCategory(category) {
        return this.request(`/services/category/${category}`);
    }

    async getService(id) {
        return this.request(`/services/${id}`);
    }

    async getAvailableSlots(date = null) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/services/slots/available${query}`);
    }

    async getSlotsInRange(startDate, endDate) {
        return this.request(`/services/slots/range?startDate=${startDate}&endDate=${endDate}`);
    }

    // Bookings endpoints
    async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    async createVoiceBooking(transcript) {
        return this.request('/bookings/voice', {
            method: 'POST',
            body: JSON.stringify({ transcript })
        });
    }

    async getBookings(status = null) {
        const query = status ? `?status=${status}` : '';
        return this.request(`/bookings${query}`);
    }

    async getBooking(id) {
        return this.request(`/bookings/${id}`);
    }

    async cancelBooking(id) {
        return this.request(`/bookings/${id}/cancel`, {
            method: 'PATCH'
        });
    }
}

export const api = new ApiService();
export default api;



