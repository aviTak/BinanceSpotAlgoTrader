const SYMBOLS = Object.freeze({ // Specify all coin pairs used (Here order is important for formula calculation)
        BTCFDUSD: {
            qtyPrecision: 5,
            pricePrecision: 2,
            minNotional: 5,
            minQty: 0.00001
        },
        DOGEBTC: {
            qtyPrecision: 0,
            pricePrecision: 8,
            minNotional: 0.0001,
            minQty: 1
        },
        DOGEFDUSD: {
            qtyPrecision: 0,
            pricePrecision: 5,
            minNotional: 1,
            minQty: 1
        },
        MANAUSDT: {
            qtyPrecision: 0,
            pricePrecision: 4,
            minNotional: 5,
            minQty: 1
        }
    }),
    CONDITION_SETS = Object.freeze({
        "A": {
            inititialQty: 10,
            trades: [
                { symbol: "BTCFDUSD", side: "BUY" },
                { symbol: "DOGEBTC", side: "BUY" },
                { symbol: "DOGEFDUSD", side: "SELL" }
               // { symbol: "MANAUSDT", side: "SELL" }
            ]
        },
        "B": {
            inititialQty: 10,
            trades: [
                { symbol: "DOGEFDUSD", side: "BUY" },
                { symbol: "DOGEBTC", side: "SELL" },
                { symbol: "BTCFDUSD", side: "SELL" }
            ]
        }
    }),
    TRANSACTION_ATTEMPTS = Object.freeze({ // User-specific
        TRANSACTION_1: 1,
        TRANSACTION_2: {
            MARKET: 30,
            BID_ASK: 30
        }
    }),
    /* DO NOT CHANGE ANYTHING BELOW THIS LINE */
    PRICE_TYPE = Object.freeze({
        MARKET_PRICE: "price",
        ASK_PRICE: "askPrice",
        BID_PRICE: "bidPrice"
    }),
    SIDE = Object.freeze({
        BUY: "BUY",
        SELL: "SELL"
    }),
    TYPE = Object.freeze({
        LIMIT: "LIMIT",
        MARKET: "MARKET"
    }),
    TIME_IN_FORCE = Object.freeze({
        GTC: "GTC",
        IOC: "IOC"
    }),
    TRANSACTION_STATUS = Object.freeze({
        COMPLETED: "COMPLETED",
        REVERSED_ATTEMPT: "REVERSED_ATTEMPT",
        REVERSED_CONDITION: "REVERSED_CONDITION",
        UNDERVALUED: "UNDERVALUED",
        ERROR: "ERROR",
        REJECTED_ATTEMPT: "REJECTED_ATTEMPT",
        REJECTED_CONDITION: "REJECTED_CONDITION"
    }),
    UNIDENTIFIED = "UNIDENTIFIED",
    ERROR_CODE = Object.freeze({
        INSUFFICIENT_QUANTITY: "INSUFFICIENT_QUANTITY"
    }),
    ORDER_STATUS = Object.freeze({
        FILLED: "FILLED",
        EXPIRED: "EXPIRED",
        PARTIALLY_FILLED: "PARTIALLY_FILLED",
        NEW: "NEW",
        CANCELED: "CANCELED"
    }),
    TRANSACTION_TEMPLATE = Object.freeze({
        processId: null, // Frequency ID
        set: null,
        orderStatus: null, // COMPLETED || REVERSED || ERROR || REJECTED || UNDERVALUED
        consumedTime: null,
        transactions: [
            { // Function 1
                orderId: null, // Unique ID generated by Binance for every transaction/order placed
                cummulativeQuoteQty: null, // Quantity of ticker 2
                executedQty: null, // Quantity of ticker 1
                executedPrice: null, // Average price of the fill orders
                marketPrice: null,
                bidPrice: null,
                askPrice: null
            },
            { // Function 2
                orderId: null,
                cummulativeQuoteQty: null,
                executedQty: null,
                executedPrice: null,
                marketPrice: null,
                bidPrice: null,
                askPrice: null
            },
            { // Function 3
                orderId: null,
                cummulativeQuoteQty: null,
                executedQty: null,
                executedPrice: null,
                marketPrice: null,
                bidPrice: null,
                askPrice: null
            },
            { // Function 4
                orderId: null,
                cummulativeQuoteQty: null,
                executedQty: null,
                executedPrice: null,
                marketPrice: null,
                bidPrice: null,
                askPrice: null
            },
            { // Reverse Function 5 is created automatically based on function 1's values (Same symbol but with opposite buy/sell)
                orderId: null,
                cummulativeQuoteQty: null,
                executedQty: null,
                executedPrice: null,
                marketPrice: null,
                bidPrice: null,
                askPrice: null
            }
        ]
    });

module.exports = {
    SYMBOLS,
    CONDITION_SETS,
    TRANSACTION_ATTEMPTS,
    PRICE_TYPE,
    SIDE,
    TYPE,
    TIME_IN_FORCE,
    TRANSACTION_STATUS,
    UNIDENTIFIED,
    ERROR_CODE,
    ORDER_STATUS,
    TRANSACTION_TEMPLATE
};
