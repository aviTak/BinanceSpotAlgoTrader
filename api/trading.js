const config = require("../config/config");
const { SYMBOLS, SIDE, TYPE, ERROR_CODE } = require("../config/constants");
const { getCapital, getQtyPrecision } = require("../utils/helpers");
const logger = require("../utils/logger");
const makeApiCall = require("./api");

async function fetchMarketPrices() {
    const symbolsParam = JSON.stringify(SYMBOLS);

    try {
        logger.info(`Request made to fetch new market prices of assets - ${JSON.stringify(SYMBOLS, null, 2)}}`);
        const prices = await makeApiCall(config.marketPricesPath, { symbols: symbolsParam });

        logger.info(`New market prices fetched: ${JSON.stringify(prices, null, 2)}`);
        return prices;
    } catch (error) {
        logger.error(`Error fetching market prices for ${JSON.stringify(SYMBOLS, null, 2)} with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function fetchBidAskPrices() {
    const symbolsParam = JSON.stringify(SYMBOLS);

    try {
        logger.info(`Request made to fetch new bid and ask prices of assets - ${JSON.stringify(SYMBOLS, null, 2)}}`);
        const prices = await makeApiCall(config.bidAskPricesPath, { symbols: symbolsParam });

        logger.info(`New bid and ask prices fetched: ${JSON.stringify(prices, null, 2)}`);
        return prices;
    } catch (error) {
        logger.error(`Error fetching bid and ask prices for ${JSON.stringify(SYMBOLS, null, 2)} with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function checkOrderStatus(params) {
    try {
        logger.info(`Request made to check status for symbol - ${params.symbol}, orderId - ${params.orderId}`);

        return makeApiCall(config.orderPath, params, "GET", true);
    } catch (error) {
        logger.error(`Error checking status for symbol - ${params.symbol}, orderId - ${params.orderId} with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function executeOrder({
    symbol,
    price,
    // bidPrice,
    // askPrice,
    side,
    type,
    timeInForce,
    quantity,
    qtyPrecision,
    minNotional,
    minQty
}) {
    const params = {
        symbol: symbol,
        side: side,
        type: type
    };

    // Remove this line; only used for testing
    // price = askPrice;

    if (side === SIDE.BUY) {
        // Common for both BUY MARKET and BUY LIMIT
        quantity = getCapital(quantity, price);
        quantity = getQtyPrecision(quantity, qtyPrecision);
        params["quantity"] = quantity;

        if (type === TYPE.LIMIT) { // BUY LIMIT
            // Add extra required paramters for Limit order
            params["price"] = price;
            params["timeInForce"] = timeInForce;
        }
    } else { // SELL
        // Common for both SELL MARKET and SELL LIMIT
        quantity = getQtyPrecision(quantity, qtyPrecision);
        params["quantity"] = quantity;

        if (type === TYPE.LIMIT) { // SELL LIMIT
            // Add extra required paramters for Limit order
            params["price"] = price;
            params["timeInForce"] = timeInForce;
        }
    }

    if (!parseFloat(quantity) || !(parseFloat(quantity) * parseFloat(price) >= minNotional) || parseFloat(quantity) < minQty) {
        const error = new Error("Quantity too low");
            error.internalCode = ERROR_CODE.INSUFFICIENT_QUANTITY;
            throw error;
    }

    try {
        logger.info(`Params for order to be executed: ${JSON.stringify(params, null, 2)}`);
        return makeApiCall(config.orderPath, params, "POST", true);
    } catch (error) {
        logger.error(`Error while executing order of params - ${JSON.stringify(params, null, 2)} with error - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

module.exports = {
    fetchMarketPrices,
    fetchBidAskPrices,
    checkOrderStatus,
    executeOrder
}
