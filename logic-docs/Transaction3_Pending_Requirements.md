**Feature:**  
**Transaction 3 – Conditional Limit Order for DOGEFDUSD (Sell)**

**Purpose:**  
The main goal of this feature is to prevent losses during the third transaction, where DOGE is sold for FDUSD. After completing the first two transactions, this feature ensures that the sell order for DOGE is placed at a price that avoids a loss or secures a potential profit. By using a conditional limit order, the system automatically adjusts the sell price based on market conditions, helping protect your trading position.

**How It Works:**

**Step 1: Complete the First Two Transactions**

1. **Transaction 1:** Buy BTC using FDUSD (BTCFDUSD, BUY).
2. **Transaction 2:** Buy DOGE using BTC (DOGEBTC, BUY).

   After these transactions, record the prices at which they were executed.

**Step 2: Calculate the Sell Price for Transaction 3 (DOGEFDUSD, SELL)**

- Use the recorded prices from the first two transactions to calculate the minimum price at which you should sell DOGE to avoid a loss.

   **Calculation:**
   \[
   \text{Calculated Price} = \frac{\text{Executed Price of DOGEBTC}}{\text{Executed Price of BTCFDUSD}}
   \]

   **Explanation:**
   - **Why do this?** You're converting the price you paid for DOGE in BTC back into FDUSD using the exchange rate from the first transaction. This gives you the breakeven price, ensuring you don't sell DOGE at a loss.

   **Example:**
   - If the price for BTCFDUSD is 50,000 FDUSD/BTC, and for DOGEBTC, it’s 0.0002 BTC/DOGE, then the calculated price is:
     \[
     \text{Calculated Price} = \frac{0.0002 \text{ BTC/DOGE}}{50,000 \text{ FDUSD/BTC}} = 0.000000004 \text{ FDUSD/DOGE}
     \]
   - This means you should sell DOGE at or above 0.000000004 FDUSD/DOGE to break even.

**Step 3: Place the Limit Order**

- Check the current ask price for DOGEFDUSD and decide on the limit order price using these rules:

   **Primary Rule:**
   - Place a limit order at the current ask price for DOGEFDUSD.

   **Secondary Rules:**
   - If the current ask price is less than the calculated price, place a limit order at the calculated price.
   - If the current ask price is higher than the calculated price, place the order at the current ask price.

**Step 4: Monitor and Adjust the Order**

- Every 3 seconds, check if the order has been filled:

   - If the order is filled within 3 seconds, you’re done.
   - If not, reevaluate the current ask price:
     - If the current ask price hasn’t increased, keep the order active.
     - If the current ask price has increased, cancel the old order and place a new one at the updated price, valid for another 3 seconds.

**Summary:**
This plan describes a strategy to sell DOGEFDUSD while minimizing the risk of a loss. By calculating the breakeven price from the first two transactions and placing a conditional limit order, the system ensures the sell order is placed at the best possible price. The order is continuously monitored and adjusted to react to market changes, improving your chances of avoiding a loss.
