// Expected order of coin pairs
const expectedOrder = ["BTCUSDT", "ETHBTC", "BNBETH", "BNBUSDT"];

// Example API response (unordered)
const marketPrices = [
    { symbol: "ETHBTC", price: "0.04360000" },
    { symbol: "BTCUSDT", price: "58600.00000000" },
    { symbol: "BNBETH", price: "0.02440000" },
    { symbol: "BNBUSDT", bidPrice: "450.00000000" }
];

const bidAskPrices = [
    { symbol: "ETHBTC", bidPrice: "0.04360000", askPrice: "0.04370000" },
    { symbol: "BTCUSDT", bidPrice: "58600.00000000", askPrice: "58700.74000000" },
    { symbol: "BNBETH", bidPrice: "0.02440000", askPrice: "0.02450000" },
    { symbol: "BNBUSDT", bidPrice: "450.00000000", askPrice: "450.50000000" }
];

// Function to map API response to the expected order for bid and ask prices
function mapResponseToOrder(expectedOrder, apiResponse, priceType) {
    return expectedOrder.map(symbol => {
        const matchedPair = apiResponse.find(pair => pair.symbol === symbol);

        return matchedPair[priceType];
    });
}

// Map the API response to the expected order for bid and ask prices
const bidPrice = mapResponseToOrder(expectedOrder, bidAskPrices, "bidPrice");
const askPrice = mapResponseToOrder(expectedOrder, bidAskPrices, "askPrice");
const marketPrice = mapResponseToOrder(expectedOrder, marketPrices, "price");

console.log({
    marketPrice,
    bidPrice,
    askPrice
});


// // Example formula using array indices
// const formula = "bid[0] + ask[1] * bid[2] - ask[3]";

// // Evaluate the formula using the bidPrices and askPrices arrays
// function evaluateFormula(bid, ask, formula) {
//     const processedFormula = formula
//         .replace(/bid\[(\d+)\]/g, (_, index) => bid[index])
//         .replace(/ask\[(\d+)\]/g, (_, index) => ask[index]);
//     return eval(processedFormula);
// }

// // Calculate the result
// const result = evaluateFormula(bidPrices, askPrices, formula);
// console.log("Result:", result);
