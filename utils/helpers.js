const crypto = require("crypto");
const logger = require("./logger");
const generateReport = require("./generateReport");
const { ERROR_CODE, TRANSACTION_STATUS, SIDE } = require("../config/constants");

function getCapital(quantity, price) {
    quantity = parseFloat(quantity);
    price = parseFloat(price);

    /* Not required - Binance is handling it */
    // quantity -= quantity * TRANSACTION_FEE;

    quantity = quantity / price;
    return quantity.toString();
}

function getQtyPrecision(quantity, qtyPrecision) {
    const factor = Math.pow(10, qtyPrecision);

    return (Math.floor(parseFloat(quantity) * factor) / factor).toString();
}

function calculateAveragePrice(fills) {
    let totalPriceQty = 0, totalQty = 0;

    fills.forEach(fill => {
        const price = parseFloat(fill.price),
            qty = parseFloat(fill.qty);

        totalPriceQty += price * qty;
        totalQty += qty;
    });

    return totalPriceQty / totalQty;
}

function generateSignature(queryString, secret) {
    return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

function updateAllPrices(transactionDetail, {
    marketPrices,
    bidAskPrices
}) {
    const updatedDetail = JSON.parse(JSON.stringify(transactionDetail)); // Copy to preserve original

    updatedDetail.transactions = updatedDetail.transactions.map(transaction => {
        const marketPrice = marketPrices?.find(priceObj => priceObj.symbol === transaction.symbol),
            bidAskPrice = bidAskPrices?.find(priceObj => priceObj.symbol === transaction.symbol);

        if (marketPrice) {
            transaction.marketPrice = marketPrice.price;
        }

        if (bidAskPrice) {
            transaction.bidPrice = bidAskPrice.bidPrice;
            transaction.askPrice = bidAskPrice.askPrice;
        }

        return transaction;
    });

    return updatedDetail;
}

function getOrderInfo(transactionDetail, index, isMarketPrice) {
    const transaction = transactionDetail.transactions[index];

    let price;

    if (isMarketPrice) {
        price = transaction.marketPrice;
    } else {
        if (transaction.side === SIDE.BUY) {
            if (parseFloat(transaction.askPrice)) { // ask/bid price and quantity can be zero in illiquid markets
                price = transaction.askPrice;
            } else {
                logger.info(`${transactionDetail.processId} - Placing limit order at market price because ask price is zero`);
                price = transaction.marketPrice;
            }
        } else {
            if (parseFloat(transaction.bidPrice)) {
                price = transaction.bidPrice;
            } else {
                logger.info(`${transaction.processId} - Placing limit order at market price because bid price is zero`);
                price = transaction.marketPrice;
            }
        }
    }

    return {
        symbol: transaction.symbol,
        price: price,
        side: transaction.side,
        qtyPrecision: transaction.qtyPrecision,
        pricePrecision: transaction.pricePrecision,
        minNotional: transaction.minNotional,
        minQty: transaction.minQty
    };
}

function updateTransactionDetail(transactionDetail, index, updateValues) {
    // Create a deep copy of the original object
    const updatedDetail = JSON.parse(JSON.stringify(transactionDetail));

    if (!updatedDetail.transactions[index]) {
        return updatedDetail;
    }

    // Update the fields
    updatedDetail.transactions[index].orderId = updateValues.orderId;
    updatedDetail.transactions[index].cummulativeQuoteQty = updateValues.cummulativeQuoteQty;
    updatedDetail.transactions[index].executedQty = updateValues.executedQty;
    updatedDetail.transactions[index].executedPrice = updateValues.fills? calculateAveragePrice(updateValues.fills) : updateValues.setPrice;

    return updatedDetail;
}

async function endSubProcess(transactionDetail, index, status, message) {
    // Create a deep copy of the original object
    const updatedDetail = JSON.parse(JSON.stringify(transactionDetail));

    updatedDetail["orderStatus"] = status;
    updatedDetail["consumedTime"] = (((new Date()).getTime() - new Date(updatedDetail.consumedTime).getTime()) / 1000).toFixed(2);
    logger.info(`${updatedDetail.processId} - Function ${index + 1}: ${message}`);
    generateReport(updatedDetail);
}

function changePrice(price, precision) {
    price = parseFloat(price);

    let increment = 1 / Math.pow(10, precision), // Calculate the smallest increment based on the precision
        increasedPrice = (price + increment).toFixed(precision);
        decreasedPrice = (price - increment).toFixed(precision);

    return [increasedPrice.toString(), decreasedPrice.toString()];
}

function handleSubProcessError(error, transactionDetail, functionIndex, quantity) {
    if (error.internalCode === ERROR_CODE.INSUFFICIENT_QUANTITY) {
        return endSubProcess(transactionDetail, functionIndex, TRANSACTION_STATUS.UNDERVALUED, `Quantity ${quantity} was so less that no further orders can be made; Terminating branch`);
    } else if (error.response && error.response.data && error.response.data.msg) {
        logger.error(`${transactionDetail.processId} - Function ${functionIndex + 1} crashed: ${error.response.data.msg}`);
    } else {
        logger.error(`${transactionDetail.processId} - Function ${functionIndex + 1} crashed: Unknown error - ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
    return endSubProcess(transactionDetail, functionIndex, TRANSACTION_STATUS.ERROR, "Something went wrong");
}

module.exports = {
    getCapital,
    getQtyPrecision,
    calculateAveragePrice,
    generateSignature,
    updateAllPrices,
    getOrderInfo,
    updateTransactionDetail,
    endSubProcess,
    changePrice,
    handleSubProcessError
};
