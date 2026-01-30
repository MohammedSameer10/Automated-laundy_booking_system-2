/**
 * Voice Command Parser for Laundry Booking Service
 * Parses natural language commands and extracts booking intent, service, date, time, and preferences
 */

// Service keywords mapping
const SERVICE_KEYWORDS = {
    wash: ['wash', 'washing', 'laundry', 'clean', 'fold', 'wash and fold'],
    dry: ['dry', 'drying', 'tumble dry', 'dry only'],
    iron: ['iron', 'ironing', 'press', 'pressing', 'wash and iron'],
    dryclean: ['dry clean', 'dry cleaning', 'dryclean', 'delicate'],
    special: ['special', 'special care', 'luxury', 'delicate care', 'silk', 'cashmere']
};

// Intent patterns
const INTENT_PATTERNS = {
    book: /\b(book|schedule|order|need|want|get|make|set up|arrange)\b/i,
    cancel: /\b(cancel|remove|delete|stop|undo)\b/i,
    list_services: /\b(what|which|list|show|tell me|services|options|offer|available)\b.*\b(service|offer|have|available|do you)\b/i,
    status: /\b(status|where|track|check|my booking|my order)\b/i
};

// Day name to offset mapping
const DAY_NAMES = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
};

// Relative date keywords
const RELATIVE_DATES = {
    'today': 0,
    'tomorrow': 1,
    'day after tomorrow': 2,
    'next week': 7
};

/**
 * Parse a voice command transcript and extract booking details
 * @param {string} transcript - The transcribed voice command
 * @returns {Object} Parsed command with intent, service, date, time, and express flag
 */
export function parseVoiceCommand(transcript) {
    const text = transcript.toLowerCase().trim();
    
    const result = {
        original: transcript,
        intent: null,
        service: null,
        date: null,
        time: null,
        express: false,
        confidence: 0
    };

    // Detect intent
    result.intent = detectIntent(text);
    
    if (result.intent === 'book') {
        // Extract service type
        result.service = extractService(text);
        
        // Extract date
        result.date = extractDate(text);
        
        // Extract time
        result.time = extractTime(text);
        
        // Check for express delivery
        result.express = /\b(express|urgent|fast|quick|same day|same-day|rush)\b/i.test(text);
        
        // Calculate confidence
        result.confidence = calculateConfidence(result);
    } else if (result.intent === 'list_services' || result.intent === 'cancel' || result.intent === 'status') {
        result.confidence = 0.9;
    }

    return result;
}

/**
 * Detect the user's intent from the text
 */
function detectIntent(text) {
    // Check for list services first (common question pattern)
    if (INTENT_PATTERNS.list_services.test(text)) {
        return 'list_services';
    }
    
    // Check for cancel
    if (INTENT_PATTERNS.cancel.test(text)) {
        return 'cancel';
    }
    
    // Check for status
    if (INTENT_PATTERNS.status.test(text)) {
        return 'status';
    }
    
    // Check for booking intent
    if (INTENT_PATTERNS.book.test(text)) {
        return 'book';
    }
    
    // Default: if service keywords are present, assume booking
    for (const category in SERVICE_KEYWORDS) {
        if (SERVICE_KEYWORDS[category].some(keyword => text.includes(keyword))) {
            return 'book';
        }
    }
    
    return null;
}

/**
 * Extract service type from text
 */
function extractService(text) {
    // Check each category
    for (const [category, keywords] of Object.entries(SERVICE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return category;
            }
        }
    }
    return null;
}

/**
 * Extract date from text
 */
function extractDate(text) {
    const today = new Date();
    
    // Check for relative dates
    for (const [keyword, offset] of Object.entries(RELATIVE_DATES)) {
        if (text.includes(keyword)) {
            const date = new Date(today);
            date.setDate(date.getDate() + offset);
            return formatDate(date);
        }
    }
    
    // Check for day names (e.g., "on Monday", "this Saturday")
    for (const [dayName, dayNum] of Object.entries(DAY_NAMES)) {
        if (text.includes(dayName)) {
            const date = getNextDayOfWeek(today, dayNum);
            return formatDate(date);
        }
    }
    
    // Check for specific date patterns (e.g., "January 15", "15th of January", "1/15")
    const datePatterns = [
        // January 15, Jan 15
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
        // 15th of January
        /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i,
        // 1/15, 01/15
        /\b(\d{1,2})\/(\d{1,2})\b/
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            return parseDateMatch(match, today);
        }
    }
    
    return null;
}

/**
 * Extract time from text
 */
function extractTime(text) {
    // Pattern for times like "2 PM", "2:30 PM", "14:00", "2 o'clock"
    const timePatterns = [
        // 2:30 PM, 2:30pm
        /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
        // 2 PM, 2pm
        /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
        // 14:00 (24-hour)
        /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
        // 2 o'clock
        /\b(\d{1,2})\s*o'?clock\b/i,
        // "at 2", "at 3" (assume PM for business hours)
        /\bat\s+(\d{1,2})\b/i,
        // morning, afternoon, evening
        /\b(morning|afternoon|evening|noon)\b/i
    ];
    
    for (const pattern of timePatterns) {
        const match = text.match(pattern);
        if (match) {
            return parseTimeMatch(match);
        }
    }
    
    return null;
}

/**
 * Parse a date match result
 */
function parseDateMatch(match, today) {
    const monthNames = {
        'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
        'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
        'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'october': 9, 'oct': 9,
        'november': 10, 'nov': 10, 'december': 11, 'dec': 11
    };
    
    let month, day;
    
    // Check if it's a month/day or day/month pattern
    if (match[1] && monthNames[match[1].toLowerCase()] !== undefined) {
        month = monthNames[match[1].toLowerCase()];
        day = parseInt(match[2]);
    } else if (match[2] && monthNames[match[2].toLowerCase()] !== undefined) {
        month = monthNames[match[2].toLowerCase()];
        day = parseInt(match[1]);
    } else if (match[1] && match[2]) {
        // Assume MM/DD format
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
    } else {
        return null;
    }
    
    const year = today.getFullYear();
    const date = new Date(year, month, day);
    
    // If date is in the past, assume next year
    if (date < today) {
        date.setFullYear(year + 1);
    }
    
    return formatDate(date);
}

/**
 * Parse a time match result
 */
function parseTimeMatch(match) {
    // Handle word-based times
    if (match[1] && /morning|afternoon|evening|noon/i.test(match[1])) {
        const wordTimes = {
            'morning': '09:00',
            'noon': '12:00',
            'afternoon': '14:00',
            'evening': '17:00'
        };
        return wordTimes[match[1].toLowerCase()];
    }
    
    let hours = parseInt(match[1]);
    let minutes = match[2] ? parseInt(match[2]) : 0;
    const meridiem = match[3] || match[2];
    
    // Handle AM/PM
    if (meridiem && /pm|p\.m\./i.test(meridiem) && hours < 12) {
        hours += 12;
    } else if (meridiem && /am|a\.m\./i.test(meridiem) && hours === 12) {
        hours = 0;
    } else if (!meridiem && hours >= 1 && hours <= 7) {
        // Assume PM for business hours without explicit meridiem
        hours += 12;
    }
    
    // Round to nearest hour for simplicity
    if (minutes > 0 && minutes < 30) minutes = 0;
    else if (minutes >= 30) {
        minutes = 0;
        hours++;
    }
    
    // Ensure valid business hours (8 AM - 6 PM)
    if (hours < 8) hours = 8;
    if (hours > 18) hours = 18;
    
    return `${hours.toString().padStart(2, '0')}:00`;
}

/**
 * Get the next occurrence of a day of the week
 */
function getNextDayOfWeek(today, dayOfWeek) {
    const date = new Date(today);
    const currentDay = today.getDay();
    const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntil);
    return date;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate confidence score for the parsed result
 */
function calculateConfidence(result) {
    let score = 0;
    
    if (result.intent === 'book') score += 0.3;
    if (result.service) score += 0.25;
    if (result.date) score += 0.25;
    if (result.time) score += 0.2;
    
    return score;
}

export default { parseVoiceCommand };


