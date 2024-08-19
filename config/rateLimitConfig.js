const Bottleneck = require("bottleneck");

// General request limiter for APIs that fall under REQUEST_WEIGHT
const generalRequestLimiter = new Bottleneck({
    reservoir: 6000, // 6000 weight units per minute
    reservoirRefreshAmount: 6000, // Refill 6000 units every minute
    reservoirRefreshInterval: 60 * 1000, // Refill every 60 seconds
    minTime: 10 // Minimum time between requests (10ms per request)
});

// Raw requests limiter
const rawRequestLimiter = new Bottleneck({
    reservoir: 61000, // Allow 61,000 requests per 5 minutes
    reservoirRefreshAmount: 61000, // Refill 61,000 requests
    reservoirRefreshInterval: 5 * 60 * 1000, // Refill every 5 minutes
    minTime: 5 // Minimum time between requests (5ms per request)
});

// Order placement limiter
const orderPlacementLimiter = new Bottleneck({
    reservoir: 50, // Allow 50 orders per 10 seconds
    reservoirRefreshAmount: 50, // Refill 50 orders every 10 seconds
    reservoirRefreshInterval: 10 * 1000, // Refill every 10 seconds
    minTime: 200 // Minimum time between requests (200ms per request)
});

// Daily order limiter (optional, for large-scale trading)
const dailyOrderLimiter = new Bottleneck({
    reservoir: 160000, // Allow 160,000 orders per day
    reservoirRefreshAmount: 160000, // Refill daily
    reservoirRefreshInterval: 24 * 60 * 60 * 1000, // Refill every 24 hours
    minTime: (24 * 60 * 60 * 1000) / 160000 // Minimum time between requests to stay under the daily limit
});


module.exports = {
    generalRequestLimiter,
    rawRequestLimiter,
    orderPlacementLimiter,
    dailyOrderLimiter
};
