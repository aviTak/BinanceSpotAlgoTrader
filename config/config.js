require("dotenv").config();

const config = {
    BASE_URL: process.env.NODE_ENV === "prod" ? "https://api.binance.com" : "https://testnet.binance.vision",
    API_KEY: process.env.NODE_ENV === "prod" ? process.env.API_KEY_PROD : process.env.API_KEY_STAGE,
    API_SECRET: process.env.NODE_ENV === "prod" ? process.env.API_SECRET_PROD : process.env.API_SECRET_STAGE,
    MARKET_PRICES_PATH: "/api/v3/ticker/price",
    BID_ASK_PRICES_PATH: "/api/v3/ticker/bookTicker",
    ORDER_PATH: "/api/v3/order"
};

module.exports = config;
