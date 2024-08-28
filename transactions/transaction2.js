const { executeOrder, fetchBidAskPrices, checkOrderStatus, cancelOrder, fetchMarketPrices } = require("../api/trading");
const { ORDER_STATUS, TRANSACTION_ATTEMPTS, TYPE, TIME_IN_FORCE, SIDE, PRICE_TYPE, SYMBOLS, TRANSACTION_STATUS } = require("../config/constants");
const { updateAllPrices, getOrderInfo, updateTransactionDetail, handleSubProcessError, mapPriceResponseToOrder } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction3 = require("./transaction3");
const reverseTransaction1 = require("./reverseTransaction1");

const FUNCTION_INDEX = 1,
    ITERATION_TIME_MARKET = 1000, // Time in ms
    ITERATION_TIME_BID_ASK = 1000,
    DELAY_STATUS_CHECK = 0;

async function transaction2(
    transactionDetail,
    quantity,
    attempts = TRANSACTION_ATTEMPTS.TRANSACTION_2.MARKET,
    isMarketPrice = true,
    shouldPlaceOrder = true
) {
    if (attempts <= 0) {
        const message = isMarketPrice
            ? `${transactionDetail.processId} - Nothing got filled at market order from function ${FUNCTION_INDEX + 1}`
            : `${transactionDetail.processId} - Nothing got filled at both market and bid/ask; Remaining quantity ${quantity} at function ${FUNCTION_INDEX + 1}: Partial`;

        logger.info(message);
        return cancelOpenOrder(transactionDetail, quantity, isMarketPrice);
    }

    logger.info(`${transactionDetail.processId} - Attempts remaining - ${attempts} at function ${FUNCTION_INDEX + 1}`);

    const bidAskPrices = await fetchBidAskPrices(),
        symbolArray = Object.keys(SYMBOLS),
        bidArray = mapPriceResponseToOrder(symbolArray, bidAskPrices, PRICE_TYPE.BID_PRICE),
        askArray = mapPriceResponseToOrder(symbolArray, bidAskPrices, PRICE_TYPE.ASK_PRICE),
        /* User-defined formulas */
        formula1 = (bidArray[2] / parseFloat(transactionDetail.transactions[0].executedPrice)) / parseFloat(transactionDetail.transactions[1].marketPrice) - 1,
        formula2 = bidArray[0] * (parseFloat(transactionDetail.transactions[1].marketPrice) / parseFloat(transactionDetail.transactions[0].executedPrice)) - 1,
        formula3 = (bidArray[2] / parseFloat(transactionDetail.transactions[0].executedPrice)) / bidArray[1] - 1,
        formula4 = bidArray[0] * (askArray[1] / parseFloat(transactionDetail.transactions[0].executedPrice)) - 1,
        formula5 = 0.1 / 122,
        side = transactionDetail.transactions[1].side,
        condition = isMarketPrice
            ? (side === SIDE.BUY ? formula1 >= formula5: formula2 >= formula5)
            : (side === SIDE.BUY ? formula3 >= formula5: formula4 >= formula5);

    logger.info(`formula1 = ${formula1}; formula2 = ${formula2}; formula3 = ${formula3}; formula4 = ${formula4}; formula5 = ${formula5}; condition = ${condition}`);

    // Check condition
    if (condition) {
        /* Code will only run for this condition block */

        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Conditions are met; Progressing`);

        if (!shouldPlaceOrder) {
            return checkOrderStatusInLoop(transactionDetail, quantity, attempts, isMarketPrice, performance.now()); // Start timer
        }

        const updatedTransactionDetail = updateAllPrices(transactionDetail, {
                /* Previous market price is taken if the below line is commented */
                // marketPrices: isMarketPrice? marketPrices : undefined,
                bidAskPrices: !isMarketPrice? bidAskPrices : undefined
            }),
            orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX, isMarketPrice); // Last parameter is used to check whether the trade is to be placed at market or at bid/ask price

        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Price updated transaction detail - ${JSON.stringify(updatedTransactionDetail)}`);

        try {
            logger.info(`${transactionDetail.processId} - Placing limit order from function ${FUNCTION_INDEX + 1} at ${isMarketPrice? "market" : "ask/buy"} price with order info - ${JSON.stringify(orderInfo, null, 2)}`);

            const executionResponse = await executeOrder({
                    ...orderInfo,
                    type: TYPE.LIMIT,
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

            if (executionResponse.status === ORDER_STATUS.FILLED) {
                logger.info(`${transactionDetail.processId} - Order ${executionResponse.status} at function ${FUNCTION_INDEX + 1}`);
                const passQty = executionResponse.side === SIDE.BUY? executionResponse.executedQty : executionResponse.cummulativeQuoteQty;

                return transaction3(newTransactionDetail, passQty);
            } else {
                await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
                return checkOrderStatusInLoop(newTransactionDetail, quantity, attempts, isMarketPrice, performance.now()); // Start timer
            }
        } catch(error) {
            handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
        }
    } else {
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Conditions are not met; Reversing order`);
        if (shouldPlaceOrder) {
            return reverseTransaction1(transactionDetail, quantity, TRANSACTION_STATUS.REVERSED_CONDITION); // Reverse order
        }
        return cancelOpenOrder(transactionDetail, quantity, false);
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

        return transaction3(newTransactionDetail, passQty);
    } else {
        // Something unusual
        logger.error(`${transactionDetail.processId} - [UNUSUAL CANCEL] Order ID: ${transactionDetail.transactions[FUNCTION_INDEX].orderId} at function ${FUNCTION_INDEX + 1} - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function cancelOpenOrder(transactionDetail, quantity, shouldReattempt) {
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

                if (shouldReattempt) {
                    // Run both transactions in parallel and return their results
                    return Promise.allSettled([
                        transaction2(newTransactionDetail, remainingAssetQty, TRANSACTION_ATTEMPTS.TRANSACTION_2.BID_ASK, false).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                        transaction3(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
                    ]);
                }

                return Promise.allSettled([
                    reverseTransaction1(newTransactionDetail, quantity, TRANSACTION_STATUS.REVERSED_ATTEMPT).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                    transaction3(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
                ]);
            } else { // Nothing got filled
                if (shouldReattempt) { // Re-attempt with bid/ask price now
                    return transaction2(newTransactionDetail, quantity, TRANSACTION_ATTEMPTS.TRANSACTION_2.BID_ASK, false);
                }

                // Reverse since both market and bid/ask orders have been attempted
                return reverseTransaction1(transactionDetail, quantity, TRANSACTION_STATUS.REVERSED_ATTEMPT);
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

async function checkOrderStatusInLoop(transactionDetail, quantity, attempts, isMarketPrice, start) {
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

        return transaction3(newTransactionDetail, passQty);
    } else { // Partial or empty case
        logger.info(`${transactionDetail.processId} - Order not fully executed at function ${FUNCTION_INDEX + 1} yet`);
        const end = performance.now(), // End timer
            iterationTime = isMarketPrice? ITERATION_TIME_MARKET : ITERATION_TIME_BID_ASK;

        if (end - start < iterationTime) { // Time is remaining
            logger.info(`${transactionDetail.processId} - Re-checking order status at function ${FUNCTION_INDEX + 1}`);
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, attempts, isMarketPrice, start);
        }

        // No time is remaining; Do not cancel just make a reattempt
        return transaction2(newTransactionDetail, quantity, attempts - 1, isMarketPrice, false);
    }
}

module.exports = transaction2;
