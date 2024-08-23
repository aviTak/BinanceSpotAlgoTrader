const env = {
    stage: {
        baseUrl: "https://testnet.binance.vision",
        apiKey: "BsqzqZH5xaWHuxaTFR7O5sQxXhrnyO26ThGgcdrTHWiK0m9upREB9JuiJZSqDE3K",
        apiSecret: "kYbAPQRNmOkDFTGgmkRKzkkM9RvGxJwPniI9EKGaKbWeBeoklSkuAtdLQq1xjG72",
        marketPricesPath: "/api/v3/ticker/price",
        bidAskPricesPath: "/api/v3/ticker/bookTicker",
        orderPath: "/api/v3/order"
    },
    prod: {
        baseUrl: 'https://api.binance.com',
        apiKey: 'your-api-key', // Change this
        apiSecret: 'your-api-secret', // Change this
        marketPricesPath: "/api/v3/ticker/price",
        bidAskPricesPath: "/api/v3/ticker/bookTicker",
        orderPath: "/api/v3/order"
    }
};

module.exports = env;
