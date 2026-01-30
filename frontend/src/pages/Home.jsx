import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

function Home() {
    const { isAuthenticated, user } = useAuth();

    return (
        <div className="home-page">
            <nav className="navbar">
                <div className="container navbar-content">
                    <Link to="/" className="logo">
                        <div className="logo-icon">🧺</div>
                        <span>LaundryVoice</span>
                    </Link>
                    <div className="nav-links">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                                <Link to="/bookings" className="nav-link">My Bookings</Link>
                                <div className="user-greeting">
                                    <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                                    <span className="user-name">{user?.name}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="nav-link">Sign In</Link>
                                <Link to="/register" className="btn btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge">🎤 Voice-Powered Booking</div>
                        <h1>Book Laundry Services <br /><span className="gradient-text">Just by Speaking</span></h1>
                        <p>
                            Say goodbye to complicated booking forms. Simply tell us what you need, 
                            and our AI assistant will handle the rest. Clean clothes, zero hassle.
                        </p>
                        <div className="hero-actions">
                            {isAuthenticated ? (
                                <Link to="/dashboard" className="btn btn-primary btn-lg">
                                    Open Dashboard →
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-lg">
                                        Start Booking →
                                    </Link>
                                    <Link to="/login" className="btn btn-secondary btn-lg">
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="voice-demo">
                            <div className="demo-bubble user">
                                <span className="bubble-avatar">🗣️</span>
                                <p>"Book wash and fold for tomorrow at 2 PM"</p>
                            </div>
                            <div className="demo-bubble assistant">
                                <span className="bubble-avatar">🤖</span>
                                <p>"Perfect! I've booked Wash & Fold for tomorrow at 2:00 PM. Total: $15"</p>
                            </div>
                            <div className="demo-mic">
                                <span>🎤</span>
                                <div className="mic-waves">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="container">
                    <h2>Why Choose LaundryVoice?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🎙️</div>
                            <h3>Voice-First Booking</h3>
                            <p>Speak naturally to book services. No forms, no clicks, just conversation.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>Express Delivery</h3>
                            <p>Need it fast? Get same-day delivery with our express option.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📅</div>
                            <h3>Flexible Scheduling</h3>
                            <p>Pick the perfect pickup time that fits your schedule.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💎</div>
                            <h3>Premium Care</h3>
                            <p>Special handling for delicate and luxury items with expert care.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="services-section">
                <div className="container">
                    <h2>Our Services</h2>
                    <div className="services-showcase">
                        <div className="service-item">
                            <span className="service-emoji">🧺</span>
                            <h4>Wash & Fold</h4>
                            <p className="service-price">$15</p>
                        </div>
                        <div className="service-item">
                            <span className="service-emoji">💨</span>
                            <h4>Dry Only</h4>
                            <p className="service-price">$10</p>
                        </div>
                        <div className="service-item">
                            <span className="service-emoji">👔</span>
                            <h4>Wash & Iron</h4>
                            <p className="service-price">$25</p>
                        </div>
                        <div className="service-item">
                            <span className="service-emoji">✨</span>
                            <h4>Dry Cleaning</h4>
                            <p className="service-price">$35</p>
                        </div>
                        <div className="service-item">
                            <span className="service-emoji">💎</span>
                            <h4>Special Care</h4>
                            <p className="service-price">$45</p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <div className="logo">
                                <div className="logo-icon">🧺</div>
                                <span>LaundryVoice</span>
                            </div>
                            <p>Smart laundry booking powered by voice.</p>
                        </div>
                        <div className="footer-links">
                            <p>&copy; 2024 LaundryVoice. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;


