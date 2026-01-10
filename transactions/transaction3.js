const { executeOrder, checkOrderStatus, cancelOrder, fetchBidAskPrices } = require("../api/trading");
const { ORDER_STATUS, TYPE, TIME_IN_FORCE, SIDE, SYMBOLS, PRICE_TYPE } = require("../config/constants");
const { getOrderInfo, updateTransactionDetail, handleSubProcessError, updateAllPrices, mapPriceResponseToOrder } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction4 = require("./transaction4");

const FUNCTION_INDEX = 2,
    ITERATION_TIME = 3000, // Time in ms
    DELAY_STATUS_CHECK = 0,
    FEE_PERCENTAGE_DOGEBTC = 0.001; // Adjusting for DOGE/BTC fee

async function transaction3(
    transactionDetail,
    quantity,
    shouldPlaceOrder = true,
    lastPlacedOrderPrice
) {
    const bidAskPrices = await fetchBidAskPrices(),
        calculatedPrice = parseFloat(transactionDetail.transactions[1].executedPrice) / parseFloat(transactionDetail.transactions[0].executedPrice),
        symbolArray = Object.keys(SYMBOLS),
        askArray = mapPriceResponseToOrder(symbolArray, bidAskPrices, PRICE_TYPE.ASK_PRICE),
        liquidityFactor = Math.abs(askArray[2] - calculatedPrice) / calculatedPrice, // Liquidity factor
        formula = (askArray[2] - calculatedPrice) / calculatedPrice - FEE_PERCENTAGE_DOGEBTC, // Deduct fee for DOGE/BTC
        condition = 0.105 / 122;

    logger.info(`formula = ${formula}; calculatedPrice = ${calculatedPrice}; condition = ${condition}`);

    if (!shouldPlaceOrder) {
        if (askArray[2] <= lastPlacedOrderPrice) {
            logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Consecutive attempt; Won't cancel order`);
            return checkOrderStatusInLoop(transactionDetail, quantity, performance.now(), lastPlacedOrderPrice);
        } else {
            logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Consecutive attempt; Canceling and placing new order`);
            return cancelOpenOrder(transactionDetail, quantity);
        }
    }

    const updatedTransactionDetail = updateAllPrices(transactionDetail, { bidAskPrices }),
        orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX);

    if (formula >= condition && liquidityFactor > 0.01) {
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Conditions are met; Progressing with bid/ask price`);
    } else {
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Conditions not met; Yet Progressing`);

        if (askArray[2] <= calculatedPrice) {
            orderInfo["price"] = calculatedPrice; // At calculated price
            logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Selecting calculated price`);
        } else {
            logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Selecting bid/ask price`);
        }
    }

    try {
        logger.info(`${transactionDetail.processId} - Placing market order from function ${FUNCTION_INDEX + 1} at ask/buy/calculated price with order info - ${JSON.stringify(orderInfo, null, 2)}`);

        const executionResponse = await executeOrder({
                ...orderInfo,
                type: TYPE.MARKET,
                timeInForce: TIME_IN_FORCE.GTC,
                quantity: quantity
            }),
            updatedValues = {
                orderId: executionResponse.orderId,
                cummulativeQuoteQty: executionResponse.cummulativeQuoteQty,
                executedQty: executionResponse.executedQty,
                setPrice: executionResponse.price,
                fills: executionResponse.fills
            },
            newTransactionDetail = updateTransactionDetail(updatedTransactionDetail, FUNCTION_INDEX, updatedValues);

        logger.info(`${transactionDetail.processId} - Execution response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(executionResponse, null, 2)})}`);

        if (executionResponse.status === ORDER_STATUS.FILLED ||
            executionResponse.status === ORDER_STATUS.EXPIRED
        ) {
            logger.info(`${transactionDetail.processId} - Order ${executionResponse.status} at function ${FUNCTION_INDEX + 1}`);
            const passQty = executionResponse.side === SIDE.BUY? executionResponse.executedQty : executionResponse.cummulativeQuoteQty;

            return transaction4(newTransactionDetail, passQty);
        } else {
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, performance.now(), orderInfo.price); // Start timer
        }
    } catch(error) {
        handleSubProcessError(error, updatedTransactionDetail, FUNCTION_INDEX, quantity);
    }
}

async function checkAndProcessOrder(transactionDetail, error) {
    const statusResponse = await checkOrderStatus({
            symbol: transactionDetail.transactions[FUNCTION_INDEX].symbol,
            orderId: transactionDetail.transactions[FUNCTION_INDEX].orderId
        }),
        updatedValues = {
            orderId: statusResponse.orderId,
            cummulativeQuoteQty: statusResponse.cummulativeQuoteQty,
            executedQty: statusResponse.executedQty,
            setPrice: statusResponse.price
            // "fills" field is not returned by Binance
        },
        newTransactionDetail = updateTransactionDetail(transactionDetail, FUNCTION_INDEX, updatedValues);

    logger.info(`${transactionDetail.processId} - Status response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(statusResponse, null, 2)})}`);

    if (statusResponse.status === ORDER_STATUS.FILLED) {
        logger.info(`${transactionDetail.processId} - Order already filled at function ${FUNCTION_INDEX + 1}`);
        const passQty = statusResponse.side === SIDE.BUY? statusResponse.executedQty : statusResponse.cummulativeQuoteQty;

        return transaction4(newTransactionDetail, passQty);
    } else {
        // Something unusual
        logger.error(`${transactionDetail.processId} - [UNUSUAL CANCEL] Order ID: ${transactionDetail.transactions[FUNCTION_INDEX].orderId} at function ${FUNCTION_INDEX + 1} - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function cancelOpenOrder(transactionDetail, quantity, shouldPlaceOrder) {
    try {
        const cancelResponse = await cancelOrder({
                symbol: transactionDetail.transactions[FUNCTION_INDEX].symbol,
                orderId: transactionDetail.transactions[FUNCTION_INDEX].orderId
            }),
            updatedValues = {
                orderId: cancelResponse.orderId,
                cummulativeQuoteQty: cancelResponse.cummulativeQuoteQty,
                executedQty: cancelResponse.executedQty,
                setPrice: cancelResponse.price
                // "fills" field is not returned by Binance
            },
            newTransactionDetail = updateTransactionDetail(transactionDetail, FUNCTION_INDEX, updatedValues);

        logger.info(`${transactionDetail.processId} - Cancel response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(cancelResponse, null, 2)})}`);

        if (cancelResponse.status === ORDER_STATUS.CANCELED) { // Partial or nothing case
            logger.info(`${transactionDetail.processId} - Order successfully canceled at function ${FUNCTION_INDEX + 1}`);

            if (parseFloat(cancelResponse.executedQty)) { // Partial case
                let passQty, repeatQty;

                if (cancelResponse.side === SIDE.BUY) {
                    passQty = cancelResponse.executedQty;
                    repeatQty = cancelResponse.cummulativeQuoteQty;
                } else {
                    passQty = cancelResponse.cummulativeQuoteQty;
                    repeatQty = cancelResponse.executedQty;
                }

                const remainingAssetQty = (parseFloat(quantity) - parseFloat(repeatQty)).toString();

                 // Run both transactions in parallel and return their results
                return Promise.allSettled([
                    transaction3(newTransactionDetail, remainingAssetQty, true).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                    transaction4(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
                ]);
            } else { // Nothing got filled
                return transaction3(newTransactionDetail, quantity, true);
            }
        } else {
            logger.info(`${transactionDetail.processId} - Order failed to cancel (based on status) at function ${FUNCTION_INDEX + 1}: No open orders`);
            // Check if the order was already executed
            return checkAndProcessOrder(newTransactionDetail);
        }
    } catch(error) {
        logger.info(`${transactionDetail.processId} - Order failed to cancel (based on error) at function ${FUNCTION_INDEX + 1}: No open orders`);
        // Check if the order was already executed
        return checkAndProcessOrder(transactionDetail, error);
    }
}

async function checkOrderStatusInLoop(transactionDetail, quantity, start, lastPlacedOrderPrice) {
    const statusResponse = await checkOrderStatus({
            symbol: transactionDetail.transactions[FUNCTION_INDEX].symbol,
            orderId: transactionDetail.transactions[FUNCTION_INDEX].orderId
        }),
        updatedValues = {
            orderId: statusResponse.orderId,
            cummulativeQuoteQty: statusResponse.cummulativeQuoteQty,
            executedQty: statusResponse.executedQty,
            setPrice: statusResponse.price
            // "fills" field is not returned by Binance
        },
        newTransactionDetail = updateTransactionDetail(transactionDetail, FUNCTION_INDEX, updatedValues);

    logger.info(`${transactionDetail.processId} - Status response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(statusResponse, null, 2)})}`);

    if (statusResponse.status === ORDER_STATUS.FILLED) {
        logger.info(`${transactionDetail.processId} - Order fully executed at function ${FUNCTION_INDEX + 1}`);
        const passQty = statusResponse.side === SIDE.BUY? statusResponse.executedQty : statusResponse.cummulativeQuoteQty;

        return transaction4(newTransactionDetail, passQty);
    } else { // Partial or empty case
        logger.info(`${transactionDetail.processId} - Order not fully executed at function ${FUNCTION_INDEX + 1} yet`);
        const end = performance.now(); // End timer

        if (end - start < ITERATION_TIME) { // Time is remaining
            logger.info(`${transactionDetail.processId} - Re-checking order status at function ${FUNCTION_INDEX + 1}`);
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, start, lastPlacedOrderPrice);
        }

        // No time is remaining; Do not cancel just make a reattempt
        return transaction3(newTransactionDetail, quantity, false, lastPlacedOrderPrice);
    }
}

module.exports = transaction3;
