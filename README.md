```markdown
# High-Frequency Trading (HFT) Using Binance Spot API

## Project Overview
This project is a High-Frequency Trading (HFT) system built using the Binance Spot API. The system is designed to execute rapid and frequent trades, leveraging price discrepancies across multiple cryptocurrency pairs to generate profits. The project includes various transactions that handle the buying and selling of assets, with logic implemented to ensure efficient and profitable trading.

## Binance Documentation
To get started, it's important to familiarize yourself with Binance's API and testnet environment:

1. **Setting up Testnet and Postman**: [Binance Blog Post](https://www.binance.com/en/blog/ecosystem/binance-api-spot-trading-with-postman-2584865726555369951)
2. **Binance Spot API Documentation**: [Binance Spot API Docs](https://docs.binance.us/#introduction)

## Steps to Start the Project
Follow these steps to manage and monitor the HFT system:

1. **Start the Application in Stage Environment**:
   ```bash
   npm run start
   ```
2. **Start the Application in Production Environment**:
   ```bash
   npm run start:prod
   ```
3. **Stop the Stage Environment**:
   ```bash
   npm run stop
   ```
4. **View Application Logs**:
   ```bash
   npm run logs
   ```
5. **View Error Logs**:
   ```bash
   npm run logs:error
   ```
6. **Delete a Running Process**:
   ```bash
   npm run delete
   ```
7. **Check the Status of Processes**:
   ```bash
   npm run status
   ```
8. **Clean Log and CSV Files (Mac/Linux)**:
   ```bash
   npm run clean
   ```

## Counting API Calls in Logs
The system tracks the number of API calls made during operation. You can use the following log keys to understand the system's API usage:

1. **COUNT[PRICES]** - Number of API calls made to fetch prices.
2. **COUNT[ORDER]** - Number of API calls made to place an order.
3. **COUNT[CANCEL]** - Number of API calls made to cancel an order.
4. **COUNT[STATUS]** - Number of API calls made to check the status of an order.

## Useful Tools and Links
Here are some tools that might be helpful during development and monitoring:

- **Merge CSV files online**: [merge-csv.com](https://merge-csv.com/)
- **Logs Prettifier**:
  - [beautifier.io](https://beautifier.io/)
  - [codebeautify.org/jsviewer](https://codebeautify.org/jsviewer)
- **String to JSON Converter**: [dadroit.com](https://dadroit.com/string-to-json/)

## Transaction Processes
### Transaction 1
1. **Fetch Market and Bid/Ask Prices**:
   - The system fetches the current market price and bid/ask prices for relevant cryptocurrency pairs to assess profitability conditions.

2. **Condition Check**:
   - If the calculated condition for profitability is met, a limit order is placed at the bid or ask price. The system then immediately checks the order status for the next 2 seconds.

3. **Order Placement and Status Check**:
   - Place a **Limit GTC (Good 'Til Canceled)** order.
   - The system checks the order status as quickly as possible.

4. **Order Execution**:
   - If the order is fully executed within 1 second, the process moves to the next transaction.
   - If the order is not filled within 1 second, it is canceled. The partially filled quantity is forwarded to the next step, and the system reattempts the remaining quantity after fetching new prices.

5. **Ask Price Execution**:
   - The limit order is placed specifically at the ask price during this transaction.

### Transaction 2
1. **Initial Setup and Price Fetching**:
   - The system fetches both the market price and bid/ask prices, similar to transaction 1.

2. **Condition Handling**:
   - **Condition 1 is False**:
     - If the primary condition is not met, the trade is reversed at the limit bid price. This reversal is attempted infinitely, with a 1-second wait between each attempt.
   - **Condition 1 is True and Condition 2 is True**:
     - A **Limit GTC** order is placed at the market price and waits for 1 second. Any quantity not executed in 1 second moves to the next step, while the executed quantity proceeds to transaction 3.
     - If needed, a **Limit GTC** order is placed at the bid/ask price with up to 2 attempts. If unsuccessful, the trade is reversed.

3. **Reverse Handling**:
   - If neither condition is met, the transaction is reversed using the predefined logic.

### Transaction 3 and Transaction 4
1. **Order Placement**:
   - A **Limit GTC** order is placed at the current bid/ask price. The system waits for 1 second for the order to fill.

2. **Handling Multiple Attempts**:
   - The system will continue to attempt the order indefinitely with new bid and ask prices for the third cryptocurrency pair, with a 1-second wait between each attempt.

3. **Order Execution Handling**:
   - If the order is partially or fully executed, the executed quantity is passed to the next transaction. If nothing is filled, the system waits for 1 second and reattempts.

4. **Transaction 4 and ReverseTransaction1**:
   - **Transaction 4** uses the same logic as described above for placing and monitoring orders.
   - **ReverseTransaction1** specifically reverses the order made in transaction 1, following the same logic and conditions as in transaction 4.

5. **Final Checks**:
   - Each transaction continuously monitors the order status. If the order is fully executed, the transaction is completed. If not, the order is canceled, and the remaining quantity is reattempted.

6. **Handling Partial Executions**:
   - If an order is only partially filled, the executed portion proceeds to the next transaction. The remaining quantity is reattempted under the same conditions.

7. **Infinite Attempts**:
   - For transactions 3, 4, and ReverseTransaction1, the system attempts to execute the order indefinitely until it is filled.

## Future Considerations for the Process

### Block A - Restart the Process When 90% of the Target is Achieved
1. **Scenario 1**: If the initial amount is 500 and it drops to 440, and the process completes, the entire process should be restarted.
2. **Scenario 2**: If the amount reaches 450 at any point, the process should be restarted.
3. **Key Rule**: Once 90% of the target amount is reached, there’s no need to run the process again just for the remaining 10%.

*Additionally*:
- **Email Alerts**: Use Nodemailer to send alerts if there are consecutive losses, ensuring that you're notified promptly when the process isn't performing as expected.

### Three Ways to Restart the Process:
1. **After Process Completion**:
   - The next process will only start once the current process is fully completed. (This is the current behavior.)

2. **Block A**:
   - Restart the process based on the criteria outlined in Block A (e.g., when 90% of the target is achieved).

3. **Continuous Restart**:
   - The process will restart every second, regardless of whether the previous process has finished or not. This ensures that the process is continually running.

## Explanation for `executedQty` vs `cummulativeQuoteQty` in Buy and Sell Orders on Binance API

When working with Binance's API for trading, it's crucial to understand the difference between `executedQty` and `cummulativeQuoteQty`, especially in strategies involving continuous buying and selling of cryptocurrency pairs.

### Key Concepts:

- **`executedQty`**: The actual quantity of the base asset that was bought or sold in a trade.
- **`cummulativeQuoteQty`**: The total quantity of the quote asset that was spent or received in the trade.

### When to Use `executedQty` vs `cummulativeQuoteQty`:

1. **For Buy Orders**:
   - **Use `executedQty`**: This represents how much of the base asset was bought.
   - **Example**:
     - Buying 0.1 ETH using 10 USDT at 100 USDT/ETH results in:
       - **`executedQty`** = 0.1 ETH
       - **`cummulativeQuoteQty`** = 10 USDT

2. **For Sell Orders**:
   - **Use `cummulativeQuoteQty`**: This represents how much of the quote asset was received from selling the base asset.
   - **Example**:
     - Selling 0.1 ETH to receive 0.05 BTC at 0.5 BTC/ETH results in:
       - **`executedQty`** = 0.1 ETH
       - **`cummulativeQuoteQty`** = 0.05 BTC

### Example Scenario: Continuous Buy and Sell of Pairs
1. **Step 1: Buying ETH with USDT**:
   - **`ETHUSDT`** pair: Buy 0.1 ETH using 10 USDT.
   - **Quantity Calculation**: `executedQty` = 0.1 ETH.

2. **Step 2: Selling ETH for BTC**:
   - **`ETHBTC`** pair: Sell the

 0.1 ETH to receive BTC.
   - **Quantity Calculation**: `executedQty` = 0.1 ETH; `cummulativeQuoteQty` = 0.05 BTC.

3. **Step 3: Buying QTUM with ETH**:
   - **`QTUMETH`** pair: Buy QTUM using 0.1 ETH.
   - **Quantity Calculation**: `executedQty` = 0.05 QTUM.

### Summary:
- **For Buy Orders**: Use `executedQty` to determine the amount of the base currency bought (e.g., ETH in `ETHUSDT`).
- **For Sell Orders**: Use `cummulativeQuoteQty` to determine the amount of the quote currency received (e.g., BTC in `ETHBTC`).

Understanding when to use `executedQty` vs `cummulativeQuoteQty` is essential for correctly tracking the assets you are trading, especially in strategies involving continuous buying and selling of cryptocurrency pairs.
```
