const { executeOrder } = require("../api/trading");
const { TRANSACTION_ATTEMPTS, TYPE, TIME_IN_FORCE, SELECTED_PRICE, SIDE, ORDER_STATUS } = require("../config/constants");
const { getOrderInfo, updateTransactionDetail, changePrice, handleSubProcessError, updatePriceAtIndex } = require("../utils/helpers");
const logger = require("../utils/logger");
const transaction4 = require("./transaction4");

const FUNCTION_INDEX = 2,
    SUB_NODES = [
        {
            name: "1",
            type: TYPE.LIMIT,
            timeInForce: TIME_IN_FORCE.IOC,
            selectedPrice: SELECTED_PRICE.SAME
        },
        {
            name: "2",
            type: TYPE.LIMIT,
            timeInForce: TIME_IN_FORCE.IOC,
            selectedPrice: SELECTED_PRICE.CHANGED
        },
        {
            name: "3",
            type: TYPE.MARKET
        }
    ];

async function transaction3(
    transactionDetail,
    quantity,
    attempts = TRANSACTION_ATTEMPTS.TRANSACTION_3,
    subNodeIndex = 0
) {
    if (attempts <= 0) {
        if (subNodeIndex >= SUB_NODES.length - 1) {
            logger.info(`${transactionDetail.processId} - Order expired in all the attempts at function ${FUNCTION_INDEX + 1}: Nothing got executed`);
            return;
        }

        subNodeIndex += 1;
        attempts = TRANSACTION_ATTEMPTS.TRANSACTION_3;

        logger.info(`${transactionDetail.processId} - Sub-node at function ${FUNCTION_INDEX + 1} changed to ${subNodeIndex + 1}: ${JSON.stringify(SUB_NODES, null, 2)}`);
    }

    let orderInfo = getOrderInfo(transactionDetail, FUNCTION_INDEX);
    const updatedTransactionDetail = JSON.parse(JSON.stringify(transactionDetail));

    if (SUB_NODES[subNodeIndex].selectedPrice === SELECTED_PRICE.CHANGED) {
        let newPrice;
        const [increasedPrice, decreasedPrice] = changePrice(orderInfo.price, orderInfo.pricePrecision);

        if (orderInfo.side === SIDE.BUY) { // Increase price
            newPrice = increasedPrice;
        } else { // Decrease price
            newPrice = decreasedPrice;
        }

        updatedTransactionDetail.transactions.price = newPrice;
        orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX);
    }

    try {
        const executionResponse = await executeOrder({
                ...orderInfo,
                type: SUB_NODES[subNodeIndex].type,
                timeInForce: SUB_NODES[subNodeIndex].timeInForce,
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

            return transaction4(newTransactionDetail, passQty);
        } else if (parseFloat(executionResponse.executedQty)) { // Partial
            logger.info(`${transactionDetail.processId} - Partial order placed at ${FUNCTION_INDEX + 1}`);

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
                transaction3(newTransactionDetail, remainingAssetQty, attempts - 1, subNodeIndex).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, remainingAssetQty)),
                transaction4(newTransactionDetail, passQty).catch(error => handleSubProcessError(error, newTransactionDetail, FUNCTION_INDEX, passQty))
            ]);
        } else { // Nothing got filled
            logger.info(`${transactionDetail.processId} - Order expired at function ${FUNCTION_INDEX + 1}: Nothing got filled - Retrying for ${attempts - 1} more attempts for sub-node - ${JSON.stringify(SUB_NODES[subNodeIndex], null, 2)}`);
            return transaction3(newTransactionDetail, quantity, attempts - 1, subNodeIndex);
        }
    } catch(error) {
        handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
    }
}

module.exports = transaction3;