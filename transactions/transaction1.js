const { executeOrder, fetchBidAskPrices, checkOrderStatus, cancelOrder, fetchMarketPrices } = require("../api/trading");
const { ORDER_STATUS, TRANSACTION_ATTEMPTS, TYPE, TIME_IN_FORCE, SIDE, CONDITION_SETS, PRICE_TYPE, TRANSACTION_STATUS, SYMBOLS } = require("../config/constants");
const { updateAllPrices, getOrderInfo, updateTransactionDetail, handleSubProcessError, mapPriceResponseToOrder, createTransactionDetail, endSubProcess } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction2 = require("./transaction2");

const FUNCTION_INDEX = 0,
    ITERATION_TIME = 2000, // Time in ms
    DELAY_STATUS_CHECK = 0;

async function transaction1(
    transactionDetail,
    quantity,
    attempts = TRANSACTION_ATTEMPTS.TRANSACTION_1
) {
    if (attempts <= 0) {
        // Leave aside the remaining quantity
        logger.info(`${transactionDetail.processId} - Remaining quantity ${quantity} at function ${FUNCTION_INDEX + 1}: Partial completion - Terminating with remaining quantity`);
        return endSubProcess(transactionDetail, FUNCTION_INDEX, TRANSACTION_STATUS.REJECTED_ATTEMPT, `Sub-process rejected: Order did not get executed in any attempt; Terminating branch`);
    }

    logger.info(`${transactionDetail.processId} - Attempts remaining - ${attempts} at function ${FUNCTION_INDEX + 1}`);

    let builtTransactionDetail;

    const [ marketPrices, bidAskPrices ] = await Promise.all([
            fetchMarketPrices(),
            fetchBidAskPrices()
        ]),
        symbolArray = Object.keys(SYMBOLS),
        bidArray = mapPriceResponseToOrder(symbolArray, bidAskPrices, PRICE_TYPE.BID_PRICE),
        askArray = mapPriceResponseToOrder(symbolArray, bidAskPrices, PRICE_TYPE.ASK_PRICE),
        marketArray = mapPriceResponseToOrder(symbolArray, marketPrices, PRICE_TYPE.MARKET_PRICE);
        /* User-defined formulas */
        formula1 = quantity?? CONDITION_SETS["A"].inititialQty + bidArray[0] * (marketArray[0] + askArray[0]) + bidArray[1] * (marketArray[1] + askArray[1]) + bidArray[2] / (marketArray[2] + askArray[2]) + bidArray[3] - marketArray[3] / askArray[3],
        formula2 = bidArray[0] - marketArray[0] / askArray[0] + bidArray[1] * 2 + marketArray[1] - 1 / askArray[1] + bidArray[2] / (marketArray[2] + askArray[2]) + bidArray[3] - marketArray[3] / askArray[3];

    // Check condition
    if (formula1 < 50 && 60 < formula2 < 100) { // Set A
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Condition 1 met; Using Set A`);
        builtTransactionDetail = createTransactionDetail(transactionDetail, "A");

        /* Changed initial quantity based on set A */
        quantity = quantity?? CONDITION_SETS["A"].inititialQty;
    } else if (formula1 > 10) { // Set B
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Condition 2 is met; Using Set B`);
        builtTransactionDetail = createTransactionDetail(transactionDetail, "B");

        /* Changed initial quantity based on set B */
        quantity = quantity?? CONDITION_SETS["B"].inititialQty;
    } else {
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Conditions are not met`);
        return endSubProcess(transactionDetail, FUNCTION_INDEX, TRANSACTION_STATUS.REJECTED_CONDITION, `Sub-process rejected: Order did not get executed as conditions were not met; Terminating branch`);
    }

    logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Created transaction detail - ${JSON.stringify(builtTransactionDetail)}`);

    const updatedTransactionDetail = updateAllPrices(builtTransactionDetail, { marketPrices, bidAskPrices }), // Use market price in-case bid/ask is zero. Also, the previous market price of pair 2 is used in function 2
        orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX);

    logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Price updated transaction detail - ${JSON.stringify(updatedTransactionDetail)}`);

    try {
        logger.info(`${transactionDetail.processId} - Placing limit order from function ${FUNCTION_INDEX + 1} at ask/buy price with order info - ${JSON.stringify(orderInfo, null, 2)}`);

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

            return transaction2(newTransactionDetail, passQty);
        } else {
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, attempts, performance.now()); // Start timer
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

        return transaction2(newTransactionDetail, passQty);
    } else {
        // Something unusual
        logger.error(`${transactionDetail.processId} - [UNUSUAL CANCEL] Order ID: ${transactionDetail.transactions[FUNCTION_INDEX].orderId} at function ${FUNCTION_INDEX + 1} - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function cancelOpenOrder(transactionDetail, quantity, attempts) {
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
                    transaction1(newTransactionDetail, remainingAssetQty, attempts - 1).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                    transaction2(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
                ]);
            } else { // Nothing got filled
                return transaction1(newTransactionDetail, quantity, attempts - 1);
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

async function checkOrderStatusInLoop(transactionDetail, quantity, attempts, start) {
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

        return transaction2(newTransactionDetail, passQty);
    } else { // Partial or empty case
        logger.info(`${transactionDetail.processId} - Order not fully executed at function ${FUNCTION_INDEX + 1} yet`);
        const end = performance.now(); // End timer

        if (end - start < ITERATION_TIME) { // Time is remaining
            logger.info(`${transactionDetail.processId} - Re-checking order status at function ${FUNCTION_INDEX + 1}`);
            await new Promise(resolve => setTimeout(resolve, DELAY_STATUS_CHECK)); // Wait and then check status
            return checkOrderStatusInLoop(newTransactionDetail, quantity, attempts, start);
        }

        // No time is remaining, cancel the current order and make a reattempt (if remaining) when the order gets canceled
        return cancelOpenOrder(newTransactionDetail, quantity, attempts);
    }
}

module.exports = transaction1;
