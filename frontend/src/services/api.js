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
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = { headers: this.getHeaders(), ...options };
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API request failed');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async register(userData) {
        const data = await this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
        if (data.token) this.setToken(data.token);
        return data;
    }

    async login(credentials) {
        const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
        if (data.token) this.setToken(data.token);
        return data;
    }

    async getProfile() { return this.request('/auth/me'); }

    async updateProfile(profileData) {
        return this.request('/auth/me', { method: 'PUT', body: JSON.stringify(profileData) });
    }

    logout() { this.setToken(null); }

    // Services
    async getServices() { return this.request('/services'); }
    async getServicesByCategory(category) { return this.request(`/services/category/${category}`); }
    async getService(id) { return this.request(`/services/${id}`); }

    async getAvailableSlots(date = null) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/services/slots/available${query}`);
    }

    async getSlotsInRange(startDate, endDate) {
        return this.request(`/services/slots/range?startDate=${startDate}&endDate=${endDate}`);
    }

    // Bookings
    async createBooking(bookingData) {
        return this.request('/bookings', { method: 'POST', body: JSON.stringify(bookingData) });
    }

    async createVoiceBooking(transcript) {
        return this.request('/bookings/voice', { method: 'POST', body: JSON.stringify({ transcript }) });
    }

    async getBookings(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/bookings${query ? `?${query}` : ''}`);
    }

    async getBooking(id) { return this.request(`/bookings/${id}`); }

    async cancelBooking(id) {
        return this.request(`/bookings/${id}/cancel`, { method: 'PATCH' });
    }

    // ── Admin endpoints ──────────────────────────────────────
    async getAdminDashboard() { return this.request('/admin/dashboard'); }

    async getAdminBookings(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/bookings${query ? `?${query}` : ''}`);
    }

    async updateBookingStatus(id, status) {
        return this.request(`/admin/bookings/${id}/status`, {
            method: 'PATCH', body: JSON.stringify({ status })
        });
    }

    async getAdminUsers() { return this.request('/admin/users'); }

    async deleteUser(id) {
        return this.request(`/admin/users/${id}`, { method: 'DELETE' });
    }

    async getAdminServices() { return this.request('/admin/services'); }

    async createService(data) {
        return this.request('/admin/services', { method: 'POST', body: JSON.stringify(data) });
    }

    async updateService(id, data) {
        return this.request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async deleteService(id) {
        return this.request(`/admin/services/${id}`, { method: 'DELETE' });
    }
}

export const api = new ApiService();
export default api;
