const { executeOrder, checkOrderStatus, cancelOrder, fetchBidAskPrices } = require("../api/trading");
const { TYPE, TIME_IN_FORCE, ORDER_STATUS, SIDE } = require("../config/constants");
const { endSubProcess, getOrderInfo, updateTransactionDetail, handleSubProcessError, updateAllPrices } = require("../utils/helpers");
const logger = require("../utils/logger");

const FUNCTION_INDEX = 4,
    ITERATION_TIME = 1000, // Time in ms
    DELAY_STATUS_CHECK = 0,
    FEE_PERCENTAGE_BTCFDUSD = 0.001; // Adjust for BTC/FDUSD fee

async function reverseTransaction1(
    transactionDetail,
    quantity,
    status
) {
    const bidAskPrices = await fetchBidAskPrices(),
        updatedTransactionDetail = updateAllPrices(transactionDetail, { bidAskPrices }),
        orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX),
        liquidityFactor = Math.abs(bidAskPrices[0].bidPrice - bidAskPrices[0].askPrice) / bidAskPrices[0].bidPrice,
        condition = liquidityFactor > 0.01;

    logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Price updated transaction detail - ${JSON.stringify(updatedTransactionDetail)}`);

    if (!condition) {
        logger.info(`${transactionDetail.processId} - Low liquidity detected, placing market order`);
        // Adjust for market order based on liquidity
        orderInfo["type"] = TYPE.MARKET;
    } else {
        orderInfo["type"] = TYPE.LIMIT;
    }

    try {
        logger.info(`${transactionDetail.processId} - Placing ${orderInfo.type} order from function ${FUNCTION_INDEX + 1} at ask/buy price with order info - ${JSON.stringify(orderInfo, null, 2)}`);

        const executionResponse = await executeOrder({
                ...orderInfo,
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
            newTransactionDetail = updateTransactionDetail(transactionDetail, FUNCTION_INDEX, updatedValues);

        logger.info(`${transactionDetail.processId} - Execution response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(executionResponse, null, 2)})}`);

        if (executionResponse.status === ORDER_STATUS.FILLED) {
            logger.info(`${transactionDetail.processId} - Order ${executionResponse.status} at function ${FUNCTION_INDEX + 1}`);
            return endSubProcess(newTransactionDetail, FUNCTION_INDEX, status, "Sub-process completed; Terminating branch");
        } else {
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, performance.now(), status); // Start timer
        }
    } catch(error) {
        handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
    }
}

async function checkAndProcessOrder(transactionDetail, status, error) {
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
        return endSubProcess(newTransactionDetail, FUNCTION_INDEX, status, "Sub-process completed; Terminating branch");
    } else {
        // Something unusual
        logger.error(`${transactionDetail.processId} - [UNUSUAL CANCEL] Order ID: ${transactionDetail.transactions[FUNCTION_INDEX].orderId} at function ${FUNCTION_INDEX + 1} - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function cancelOpenOrder(transactionDetail, quantity, status) {
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
                    reverseTransaction1(newTransactionDetail, remainingAssetQty, status).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                    endSubProcess(newTransactionDetail, FUNCTION_INDEX, status, "Sub-process completed; Terminating branch").catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
                ]);
            } else { // Nothing got filled
                return reverseTransaction1(newTransactionDetail, quantity, status);
            }
        } else {
            logger.info(`${transactionDetail.processId} - Order failed to cancel (based on status) at function ${FUNCTION_INDEX + 1}: No open orders`);
            // Check if the order was already executed
            return checkAndProcessOrder(newTransactionDetail, status);
        }
    } catch(error) {
        logger.info(`${transactionDetail.processId} - Order failed to cancel (based on error) at function ${FUNCTION_INDEX + 1}: No open orders`);
        // Check if the order was already executed
        return checkAndProcessOrder(transactionDetail, status, error);
    }
}

async function checkOrderStatusInLoop(transactionDetail, quantity, start, status) {
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
        return endSubProcess(newTransactionDetail, FUNCTION_INDEX, status, "Sub-process completed; Terminating branch");
    } else { // Partial or empty case
        logger.info(`${transactionDetail.processId} - Order not fully executed at function ${FUNCTION_INDEX + 1} yet`);
        const end = performance.now(); // End timer

        if (end - start < ITERATION_TIME) { // Time is remaining
            logger.info(`${transactionDetail.processId} - Re-checking order status at function ${FUNCTION_INDEX + 1}`);
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, start, status);
        }

        // No time is remaining, cancel the current order and make a reattempt (if remaining) when the order gets canceled
        return cancelOpenOrder(newTransactionDetail, quantity, status);
    }
}

module.exports = reverseTransaction1;
