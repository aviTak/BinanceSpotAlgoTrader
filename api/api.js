const axios = require("axios");
const Bottleneck = require("bottleneck");

const config = require("../config/config");
const { generateSignature } = require("../utils/helpers");
const logger = require("../utils/logger");
const { RATE_LIMIT } = require("../config/constants");

// Create a limiter
const limiter = new Bottleneck({
    reservoir: RATE_LIMIT.REQUESTS, // Initial amount of requests
    reservoirRefreshAmount: RATE_LIMIT.REQUESTS, // Number of requests to add at each interval
    reservoirRefreshInterval: RATE_LIMIT.TIME * 1000, // Interval in milliseconds (10 seconds)
    minTime: (RATE_LIMIT.TIME * 1000) / RATE_LIMIT.REQUESTS // Minimum time between each request in ms
});

async function makeApiCall(endpoint, params = {}, method = "GET", authRequired = false ) {
    let url = `${config.baseUrl}${endpoint}`, response;

    try {
        if (authRequired) {
            const timestamp = Date.now(), headers = {};

            params.timestamp = timestamp;

            // Generate query string before adding signature
            let queryString = new URLSearchParams(params).toString();
            const signature = generateSignature(queryString, config.apiSecret);

            params.signature = signature;
            headers["X-MBX-APIKEY"] = config.apiKey;

            // Recreate query string with signature
            queryString = new URLSearchParams(params).toString();

            if (queryString) {
                url += `?${queryString}`;
            }

            response = await limiter.schedule(() => axios({
                method: method,
                url: url,
                headers: headers
            }));
        } else {
            const queryString = new URLSearchParams(params).toString();

            if (queryString) {
                url += `?${queryString}`;
            }

            response = await axios({
                method: method,
                url: url
            });
        }

        logger.info(`Response from API call to ${endpoint} method - ${method}: ${JSON.stringify(response.data, null, 2)}`);
        return response.data;
    } catch (error) {
        logger.error(`Error making API call to ${endpoint} method - ${method}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

module.exports = makeApiCall;
