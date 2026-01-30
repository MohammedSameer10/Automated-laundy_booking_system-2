import { useState, useEffect } from 'react';
import api from '../services/api';
import './TimeSlotPicker.css';

function TimeSlotPicker({ selectedDate, selectedTime, onDateChange, onTimeChange }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);

    useEffect(() => {
        loadSlots();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            // Reset time when date changes
            onTimeChange(null);
        }
    }, [selectedDate]);

    async function loadSlots() {
        setLoading(true);
        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 14);

            const { slots: fetchedSlots } = await api.getSlotsInRange(
                formatDate(today),
                formatDate(endDate)
            );

            setSlots(fetchedSlots);

            // Extract unique dates
            const dates = [...new Set(fetchedSlots.map(s => s.date))].sort();
            setAvailableDates(dates);

            // Auto-select first available date if none selected
            if (!selectedDate && dates.length > 0) {
                onDateChange(dates[0]);
            }
        } catch (err) {
            console.error('Failed to load slots:', err);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function formatDisplayDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateStr === formatDate(today)) {
            return 'Today';
        } else if (dateStr === formatDate(tomorrow)) {
            return 'Tomorrow';
        }

        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function formatTime(timeStr) {
        const [hours] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12} ${ampm}`;
    }

    function getTimeSlotsForDate(date) {
        return slots.filter(s => s.date === date && s.available_capacity > 0);
    }

    const timeSlotsForSelectedDate = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

    if (loading) {
        return (
            <div className="time-slot-picker loading">
                <div className="loading-spinner"></div>
                <p>Loading available slots...</p>
            </div>
        );
    }

    return (
        <div className="time-slot-picker">
            <div className="picker-section">
                <h4>📅 Select Date</h4>
                <div className="date-grid">
                    {availableDates.slice(0, 7).map(date => (
                        <button
                            key={date}
                            className={`date-button ${selectedDate === date ? 'selected' : ''}`}
                            onClick={() => onDateChange(date)}
                        >
                            <span className="date-label">{formatDisplayDate(date)}</span>
                            <span className="date-full">{date}</span>
                        </button>
                    ))}
                </div>
            </div>

            {selectedDate && (
                <div className="picker-section">
                    <h4>⏰ Select Time</h4>
                    {timeSlotsForSelectedDate.length === 0 ? (
                        <p className="no-slots">No available slots for this date</p>
                    ) : (
                        <div className="time-grid">
                            {timeSlotsForSelectedDate.map(slot => (
                                <button
                                    key={slot.id}
                                    className={`time-button ${selectedTime === slot.time_slot ? 'selected' : ''}`}
                                    onClick={() => onTimeChange(slot.time_slot)}
                                >
                                    <span className="time-label">{formatTime(slot.time_slot)}</span>
                                    <span className="slots-left">{slot.available_capacity} left</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TimeSlotPicker;


