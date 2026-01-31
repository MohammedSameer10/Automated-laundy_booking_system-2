import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const data = await api.getProfile();
                setUser(data.user);
            } catch (err) {
                console.error('Auth check failed:', err);
                api.logout();
            }
        }
        setLoading(false);
    }

    async function login(email, password) {
        const data = await api.login({ email, password });
        setUser(data.user);
        return data;
    }

    async function register(userData) {
        const data = await api.register(userData);
        setUser(data.user);
        return data;
    }

    function logout() {
        api.logout();
        setUser(null);
    }

    async function updateProfile(profileData) {
        const data = await api.updateProfile(profileData);
        setUser(data.user);
        return data;
    }

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;



