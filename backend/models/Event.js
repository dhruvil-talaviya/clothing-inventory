const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    // ── NEW: date range fields ─────────────────────────────────────────────
    // Status (Upcoming / Active / Completed) is NEVER stored —
    // it is always computed live from these two dates on every request.
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },

    // ── LEGACY: kept for backward compatibility with old events ───────────
    // New events set date = startDate automatically.
    date: {
        type: Date
    },

    location: {
        type: String,
        default: 'In-Store',
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    saleOffer: {
        type: String,
        trim: true,
        default: ''
    },

    // ── REMOVED: status field ─────────────────────────────────────────────
    // Status is computed dynamically in the route from startDate/endDate.
    // Keeping this here as a virtual so old code that reads .status still works.

}, { timestamps: true });

// Virtual: always return live computed status (never stale)
EventSchema.virtual('liveStatus').get(function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = this.startDate || this.date;
    const end   = this.endDate   || start;

    if (!start) return 'Upcoming';

    const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
    const endDay   = new Date(end);   endDay.setHours(0, 0, 0, 0);

    if (today < startDay) return 'Upcoming';
    if (today > endDay)   return 'Completed';
    return 'Active';
});

// Include virtuals when converting to JSON / plain object
EventSchema.set('toJSON',   { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

// Index for efficient date-range queries
EventSchema.index({ startDate: 1 });
EventSchema.index({ endDate:   1 });

module.exports = mongoose.model('Event', EventSchema);