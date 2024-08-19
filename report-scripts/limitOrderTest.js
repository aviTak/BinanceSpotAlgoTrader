const { fetchMarketPrices, fetchBidAskPrices, executeOrder, checkOrderStatus } = require("../api/trading");
const { ORDER_STATUS, INITIAL_QUANTITY, TYPE, TIME_IN_FORCE, TRANSACTION_DETAIL } = require("../config/constants");
const { updateAllPrices, getOrderInfo, updateTransactionDetail, handleSubProcessError } = require("../utils/helpers");
const logger = require("../utils/logger");

const FUNCTION_INDEX = 0;

async function limitOrderTest(
    transactionDetail = TRANSACTION_DETAIL,
    quantity = INITIAL_QUANTITY
) {
    try {
        let timeTaken, attempts = 1;

        const [ marketPrices, bidAskPrices ] = await Promise.all([
                fetchMarketPrices(),
                fetchBidAskPrices()
            ]),
            updatedTransactionDetail = updateAllPrices(transactionDetail, { marketPrices, bidAskPrices }),
            orderInfo = getOrderInfo(updatedTransactionDetail, FUNCTION_INDEX),
            start = performance.now(); // Start timer
            executionResponse = await executeOrder({
                ...orderInfo,
                type: TYPE.LIMIT,
                timeInForce: TIME_IN_FORCE.GTC,
                quantity: quantity
            });

        if (executionResponse.status === ORDER_STATUS.FILLED) {
            const end = performance.now(); // End timer

            timeTaken = ((end - start) / 1000).toFixed(2);

            logger.error(`Exceuted quantity: ${executionResponse.executedQty}; Time taken - ${timeTaken}s`);
        } else {
            while (true) {
                attempts++;
                const statusResponse = await checkOrderStatus({
                    symbol: transactionDetail.transactions[FUNCTION_INDEX].symbol,
                    orderId: executionResponse.orderId
                });

                const end = performance.now(); // End timer

                timeTaken = ((end - start) / 1000).toFixed(2);
                logger.error(`Exceuted quantity: ${statusResponse.executedQty}; Time taken - ${timeTaken}s`);

                if (statusResponse.status === ORDER_STATUS.FILLED) {
                    const end = performance.now(); // End timer

                    timeTaken = ((end - start) / 1000).toFixed(2);
                    break;
                }
            }
        }

        const mergedPrices = marketPrices.map((marketPrice) => {
            // Find the corresponding bid/ask prices for the symbol
            const bidAskPrice = bidAskPrices.find((item) => item.symbol === marketPrice.symbol);

            // Merge market prices with bid/ask prices
            return {
                symbol: marketPrice.symbol,
                price: marketPrice.price,
                bidPrice: bidAskPrice ? bidAskPrice.bidPrice : null,
                bidQty: bidAskPrice ? bidAskPrice.bidQty : null,
                askPrice: bidAskPrice ? bidAskPrice.askPrice : null,
                askQty: bidAskPrice ? bidAskPrice.askQty : null
            };
        });

        logger.error(`${JSON.stringify(mergedPrices, null, 2)}; Time taken - ${timeTaken}s in ${attempts} attempts`);
    } catch(error) {
        handleSubProcessError(error, transactionDetail, FUNCTION_INDEX, quantity);
    }
}

async function run() {
    while (true) {
        await limitOrderTest();
    }
}

run();
