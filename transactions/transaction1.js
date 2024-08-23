const { fetchMarketPrices, executeOrder } = require("../api/trading");
const { ORDER_STATUS, TRANSACTION_ATTEMPTS, INITIAL_QUANTITY, TYPE, TIME_IN_FORCE, SIDE } = require("../config/constants");
const { updateAllPrices, getOrderInfo, updateTransactionDetail, handleSubProcessError } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction2 = require("./transaction2");

const FUNCTION_INDEX = 0;

async function transaction1(
    transactionDetail,
    quantity = INITIAL_QUANTITY,
    attempts = TRANSACTION_ATTEMPTS.TRANSACTION_1
) {
    if (attempts <= 0) {
        logger.info(`${transactionDetail.processId} - Remaining quantity ${quantity} at function ${FUNCTION_INDEX + 1}: Partial`);
        return;
    }

    if (transactionDetail.condition !== 1) {
        logger.info(`${transactionDetail.processId} - Function ${FUNCTION_INDEX + 1}: Condition is not 1`);
        return;
    }

    const marketPrices = await fetchMarketPrices(),
        updatedTransactionDetail = updateAllPrices(transactionDetail, { marketPrices }),
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

        logger.info(`${transactionDetail.processId} - Response from function ${FUNCTION_INDEX + 1}: ${JSON.stringify(executionResponse, null, 2)})}`);

        if (executionResponse.status === ORDER_STATUS.FILLED) {
            logger.info(`${transactionDetail.processId} - Order fully executed at function ${FUNCTION_INDEX + 1}`);
            const passQty = executionResponse.side === SIDE.BUY? executionResponse.executedQty : executionResponse.cummulativeQuoteQty;

            return transaction2(newTransactionDetail, passQty);
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
                transaction1(newTransactionDetail, remainingAssetQty, attempts - 1).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                transaction2(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
            ]);
        } else { // Nothing got filled
            logger.info(`${transactionDetail.processId} - Order expired at function ${FUNCTION_INDEX + 1}: Nothing got filled - Retrying`);
            return transaction1(newTransactionDetail);
        }
    } catch(error) {
        handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
    }
}

module.exports = transaction1;
