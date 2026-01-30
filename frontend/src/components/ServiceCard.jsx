import './ServiceCard.css';

const CATEGORY_ICONS = {
    wash: '🧺',
    dry: '💨',
    iron: '👔',
    dryclean: '✨',
    special: '💎',
    addon: '⚡'
};

const CATEGORY_COLORS = {
    wash: '#06d6a0',
    dry: '#118ab2',
    iron: '#ffd166',
    dryclean: '#ef476f',
    special: '#9b5de5',
    addon: '#f72585'
};

function ServiceCard({ service, selected, onSelect, disabled }) {
    const icon = CATEGORY_ICONS[service.category] || '📦';
    const color = CATEGORY_COLORS[service.category] || '#06d6a0';

    return (
        <div 
            className={`service-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onSelect(service)}
            style={{ '--accent-color': color }}
        >
            <div className="service-card-icon">
                {icon}
            </div>
            <div className="service-card-content">
                <h4>{service.name}</h4>
                <p>{service.description}</p>
                <div className="service-card-meta">
                    <span className="service-price">${service.price.toFixed(2)}</span>
                    {service.duration_minutes > 0 && (
                        <span className="service-duration">⏱ {service.duration_minutes} min</span>
                    )}
                </div>
            </div>
            {selected && (
                <div className="service-card-check">✓</div>
            )}
        </div>
    );
}

export default ServiceCard;


