const axios = require("axios");

const config = require("../config/config");
const { generateSignature } = require("../utils/helpers");
const logger = require("../utils/logger");

async function makeApiCall(endpoint, params = {}, method = "GET", authRequired = false ) {
    let url = `${config.baseUrl}${endpoint}`, response;

    try {
        if (authRequired) {
            const timestamp = Date.now(), headers = {};

            params.timestamp = timestamp;

                params.selfTradePreventionMode = "NONE"  // Disable STP
            }

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

            response = await axios({
                method: method,
                url: url,
                headers: headers
            });
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
