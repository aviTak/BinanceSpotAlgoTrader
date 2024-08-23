const { fetchMarketPrices, executeOrder } = require("../api/trading");
const { TRANSACTION_ATTEMPTS, ORDER_STATUS, TYPE, TIME_IN_FORCE, SIDE } = require("../config/constants");
const { getOrderInfo, updateAllPrices, updateTransactionDetail, handleSubProcessError } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction3 = require("./transaction3");
const transaction4 = require("./transaction4");

const FUNCTION_INDEX = 1;

async function transaction2(
    transactionDetail,
    quantity,
    attempts = TRANSACTION_ATTEMPTS.TRANSACTION_2,
    isAReattempt
) {
    if (attempts <= 0) {
        logger.info(`${transactionDetail.processId} - Order expired in all the attempts at function ${FUNCTION_INDEX + 1}: Nothing got executed`);
        return transaction4(transactionDetail, quantity, true); // Reverse order
    }

    let orderInfo, updatedTransactionDetail;

    if (isAReattempt) {
        if (transactionDetail.condition !== 1) {
            logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Condition is not 1`);
            return transaction4(transactionDetail, quantity, true); // Reverse order
        }

        const marketPrices = await fetchMarketPrices();

        updatedTransactionDetail = updateAllPrices(transactionDetail, { marketPrices });
    } else {
        updatedTransactionDetail = JSON.parse(JSON.stringify(transactionDetail));
    }

    orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX);

    try {
        const executionResponse = await executeOrder({
                ...orderInfo,
                type: TYPE.LIMIT,
                timeInForce: TIME_IN_FORCE.IOC,
                quantity: quantity
            }),
            updatedValues = {
                orderId: executionResponse.orderId,
                cummulativeQuoteQty: executionResponse.cummulativeQuoteQty,
                executedQty: executionResponse.executedQty,
                executionPrice: executionResponse.executionPrice,
                fills: executionResponse.fills
            },
            newTransactionDetail = updateTransactionDetail(updatedTransactionDetail, FUNCTION_INDEX, updatedValues);

        logger.info(`${transactionDetail.processId} - Response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(executionResponse, null, 2)}`);

        if (executionResponse.status === ORDER_STATUS.FILLED) {
            logger.info(`${transactionDetail.processId} - Order fully executed at function ${FUNCTION_INDEX + 1}`);
            const passQty = executionResponse.side === SIDE.BUY? executionResponse.executedQty : executionResponse.cummulativeQuoteQty;

            return transaction3(newTransactionDetail, passQty);
        } else if (parseFloat(executionResponse.executedQty)) { // Partial
            logger.info(`${transactionDetail.processId} - Partial order placed at function ${FUNCTION_INDEX + 1}`);

            if (executionResponse.side === SIDE.BUY) {
                passQty = executionResponse.executedQty;
                repeatQty = executionResponse.cummulativeQuoteQty;
            } else {
                passQty = executionResponse.cummulativeQuoteQty;
                repeatQty = executionResponse.executedQty;
            }

            const remainingAssetQty = (parseFloat(quantity) - parseFloat(repeatQty)).toString();

            // Run both transactions in parallel and return their results
            return Promise.allSettled([
                deciTransaction(newTransactionDetail, remainingAssetQty, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                transaction3(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
            ]);
        } else { // Nothing got filled
            logger.info(`${transactionDetail.processId} - Order expired at function ${FUNCTION_INDEX + 1}: Nothing got filled - ${attempts - 1} attempts remaining`);
            return transaction2(updatedTransactionDetail, quantity, attempts - 1, true);
        }
    } catch(error) {
        handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
    }
}

async function deciTransaction(
    transactionDetail,
    remainingAssetQty,
    executedQty
) {
    remainingAssetQty = parseFloat(remainingAssetQty);
    executedQty = parseFloat(executedQty);

    const partitions = Math.ceil(remainingAssetQty / (executedQty + remainingAssetQty)) * 10,
        individualQty = remainingAssetQty / partitions,
        promises = [];

    let stopLoop = false; // Added a flag to control the loop execution

    logger.info(`Deci function started: Individual Asset Quantity = ${individualQty}; Remaining Asset Quantity = ${remainingAssetQty}; Partitions = ${partitions}`);

    for (let i = 0; i < partitions; i++) {
        if (transactionDetail.condition !== 1) {
            return transaction4(transactionDetail, individualQty * (i + 1), true); // Reverse order
        }

        // Process the iteration without awaiting here to ensure non-blocking behavior
        const processIteration = async (i) => {
            const marketPrices = await fetchMarketPrices(),
                updatedTransactionDetail = updateAllPrices(transactionDetail, { marketPrices }),
                orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX);

            try {
                const executionResponse = await executeOrder({
                        ...orderInfo,
                        type: TYPE.LIMIT,
                        timeInForce: TIME_IN_FORCE.IOC,
                        quantity: individualQty.toString()
                    }),
                    updatedValues = {
                        orderId: executionResponse.orderId,
                        cummulativeQuoteQty: executionResponse.cummulativeQuoteQty,
                        executedQty: executionResponse.executedQty,
                        executionPrice: executionResponse.executionPrice,
                        fills: executionResponse.fills
                    },
                    newTransactionDetail = updateTransactionDetail(updatedTransactionDetail, FUNCTION_INDEX, updatedValues);

                logger.info(`${transactionDetail.processId} - Response from deci function ${FUNCTION_INDEX + 1}: ${JSON.stringify(executionResponse, null, 2)}}`);

                if (executionResponse.status === ORDER_STATUS.FILLED) {
                    logger.info(`${transactionDetail.processId} - Order fully executed at deci function ${FUNCTION_INDEX + 1} in ${i + 1}th part`);

                    const passQty = executionResponse.side === SIDE.BUY? executionResponse.executedQty : executionResponse.cummulativeQuoteQty;
                    // Call transaction3 in parallel and continue to the next iteration
                    promises.push(transaction3(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, executionResponse.executedQty)));
                } else if (parseFloat(executionResponse.executedQty)) { // Partial
                    logger.info(`${transactionDetail.processId} - Partial order placed at deci function ${FUNCTION_INDEX + 1} in ${i + 1}th part`);

                    logger.info(`${transactionDetail.processId} - Partial order placed at function ${FUNCTION_INDEX + 1}`);

                    if (executionResponse.side === SIDE.BUY) {
                        passQty = executionResponse.executedQty;
                        repeatQty = executionResponse.cummulativeQuoteQty;
                    } else {
                        passQty = executionResponse.cummulativeQuoteQty;
                        repeatQty = executionResponse.executedQty;
                    }

                    const deciRemainingAssetQty = (parseFloat(individualQty) - parseFloat(repeatQty)).toString();

                    // Run both transactions in parallel and return their results
                    promises.push(
                        transaction3(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty)),
                        transaction4(newTransactionDetail, (parseFloat(deciRemainingAssetQty) + individualQty * (partitions - i - 1)).toString(), true) // Reverse order
                            .catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, deciRemainingQty))
                    );
                    stopLoop = true; // Terminate the loop
                } else { // Nothing got filled
                    logger.info(`${transactionDetail.processId} - Order expired at deci function ${FUNCTION_INDEX + 1}: Nothing got filled in ${i + 1}th part`);
                    promises.push(transaction4(newTransactionDetail, (individualQty * (partitions - i)).toString()), true); // Reverse Order
                    stopLoop = true; // Terminate the loop
                }
            } catch(error) {
                handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, remainingAssetQty);
                stopLoop = true; // Terminate the loop on error
            }
        };

        try {
            await processIteration(i);

            if (stopLoop) {
                break;
            }
        } catch(error) {
            logger.error(`${transactionDetail.processId} - Deci Function 2 crashed: Unknown error - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
            handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, remainingAssetQty);
            break;
        }
    }

    // Wait for all promises to settle
    return Promise.allSettled(promises);
}

module.exports = transaction2;
