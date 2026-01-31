import { useState, useEffect } from 'react';
import api from '../services/api';
import ServiceCard from './ServiceCard';
import TimeSlotPicker from './TimeSlotPicker';
import './BookingForm.css';

function BookingForm({ onBookingCreated, onClose }) {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [expressDelivery, setExpressDelivery] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        try {
            const { services: fetchedServices } = await api.getServices();
            // Filter out addon services for display
            setServices(fetchedServices.filter(s => s.category !== 'addon'));
        } catch (err) {
            setError('Failed to load services');
        }
    }

    function calculateTotal() {
        if (!selectedService) return 0;
        let total = selectedService.price;
        if (expressDelivery) {
            total += 10; // Express addon price
        }
        return total;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!selectedService || !selectedDate || !selectedTime) {
            setError('Please complete all required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { booking } = await api.createBooking({
                serviceId: selectedService.id,
                pickupDate: selectedDate,
                pickupTime: selectedTime,
                deliveryType: expressDelivery ? 'express' : 'standard',
                notes
            });

            if (onBookingCreated) {
                onBookingCreated(booking);
            }
        } catch (err) {
            setError(err.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    }

    function nextStep() {
        if (step === 1 && selectedService) {
            setStep(2);
        } else if (step === 2 && selectedDate && selectedTime) {
            setStep(3);
        }
    }

    function prevStep() {
        if (step > 1) {
            setStep(step - 1);
        }
    }

    return (
        <div className="booking-form-container">
            <div className="booking-form-header">
                <h2>📋 New Booking</h2>
                {onClose && (
                    <button className="close-button" onClick={onClose}>✕</button>
                )}
            </div>

            <div className="booking-steps">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Service</span>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">Schedule</span>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <span className="step-number">3</span>
                    <span className="step-label">Confirm</span>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Step 1: Select Service */}
                {step === 1 && (
                    <div className="form-step">
                        <h3>Choose a Service</h3>
                        <div className="services-grid">
                            {services.map(service => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    selected={selectedService?.id === service.id}
                                    onSelect={setSelectedService}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Date & Time */}
                {step === 2 && (
                    <div className="form-step">
                        <h3>Schedule Pickup</h3>
                        <TimeSlotPicker
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            onDateChange={setSelectedDate}
                            onTimeChange={setSelectedTime}
                        />
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <div className="form-step">
                        <h3>Review & Confirm</h3>
                        
                        <div className="booking-summary">
                            <div className="summary-item">
                                <span className="summary-label">Service</span>
                                <span className="summary-value">{selectedService?.name}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Pickup Date</span>
                                <span className="summary-value">{selectedDate}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Pickup Time</span>
                                <span className="summary-value">{selectedTime}</span>
                            </div>
                            
                            <div className="express-option">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={expressDelivery}
                                        onChange={(e) => setExpressDelivery(e.target.checked)}
                                    />
                                    <span className="checkbox-custom"></span>
                                    <span>
                                        <strong>Express Delivery</strong>
                                        <small>Same-day delivery (+$10)</small>
                                    </span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Special Instructions (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any special care instructions..."
                                    rows={3}
                                />
                            </div>

                            <div className="summary-total">
                                <span>Total</span>
                                <span className="total-price">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-actions">
                    {step > 1 && (
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            ← Back
                        </button>
                    )}
                    {step < 3 ? (
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={nextStep}
                            disabled={
                                (step === 1 && !selectedService) ||
                                (step === 2 && (!selectedDate || !selectedTime))
                            }
                        >
                            Continue →
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Booking...' : 'Confirm Booking ✓'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default BookingForm;



