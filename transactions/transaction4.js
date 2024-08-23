const { executeOrder } = require("../api/trading");
const { TYPE, TRANSACTION_STATUS } = require("../config/constants");
const { endSubProcess, getOrderInfo, updateTransactionDetail, handleSubProcessError } = require("../utils/helpers");

const FUNCTION_INDEX = 3,
    REVERSE_FUNCTION_INDEX = 4;

// We transact in market order
async function transaction4(transactionDetail, quantity, isReverse) {
    let functionIndex = isReverse? 0 : FUNCTION_INDEX;

    if (isReverse) {
        functionIndex = REVERSE_FUNCTION_INDEX;
    } else {
        functionIndex = FUNCTION_INDEX;
    }

    const orderInfo = getOrderInfo(transactionDetail, functionIndex),
        transactionStatus = isReverse? TRANSACTION_STATUS.REVERSED : TRANSACTION_STATUS.COMPLETED;

    try {
        const executionResponse = await executeOrder({
                ...orderInfo,
                type: TYPE.MARKET,
                quantity: quantity
            }),
            updatedValues = {
                orderId: executionResponse.orderId,
                cummulativeQuoteQty: executionResponse.cummulativeQuoteQty,
                executedQty: executionResponse.executedQty,
                executionPrice: executionResponse.executionPrice,
                fills: executionResponse.fills
            },
            newTransactionDetail = updateTransactionDetail(transactionDetail, functionIndex, updatedValues);

        return endSubProcess(newTransactionDetail, functionIndex, transactionStatus, "Sub-process completed; Terminating branch");
    } catch(error) {
        handleSubProcessError(error, transactionDetail, functionIndex, quantity);
    }
}

module.exports = transaction4;
