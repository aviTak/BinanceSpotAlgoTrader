## Feature: Transaction 3 – Conditional Limit Order for DOGEFDUSD (Sell)

1. Why:
The goal of this feature is to avoid losses during the third transaction (DOGEFDUSD, SELL). Given the executed prices from the first two transactions, this feature ensures that the sell order is placed at a price that either avoids a loss or captures a potential profit. By placing a conditional limit order, the system dynamically adjusts the sell price based on market conditions, thereby protecting the trader’s position.

2. How:
The feature will be implemented as follows:

Step 1: Execute Transactions 1 and 2:

Transaction 1: Buy BTC using FDUSD (BTCFDUSD, BUY)
Transaction 2: Buy DOGE using BTC (DOGEBTC, BUY)
Capture the executed prices from these two transactions.
Step 2: Calculate the Price for Transaction 3 (DOGEFDUSD, SELL):

Use the executed prices from the first two transactions to calculate the breakeven price for the third transaction.
Formula:
[
\text{Calculated Price} = \frac{\text{Executed Price of DOGEBTC}}{\text{Executed Price of BTCFDUSD}}
]

Human-readable format: Calculated Price = (Executed Price of DOGEBTC) / (Executed Price of BTCFDUSD)
Explanation:

Understanding the Transactions:

The first transaction (BTCFDUSD, BUY) provides the cost of acquiring BTC using FDUSD.
The second transaction (DOGEBTC, BUY) provides the cost of acquiring DOGE using BTC.
The goal is to determine the minimum price at which DOGE should be sold in FDUSD (DOGEFDUSD) to avoid a loss.
Why Divide?

You divide because you're converting the price you paid in BTC for DOGE back into FDUSD terms using the exchange rate from the first transaction.
This ensures that the calculated price represents the minimum price at which you should sell DOGE to at least break even, considering the costs from both prior transactions.
Example:

If the executed price for BTCFDUSD is 50,000 FDUSD/BTC and for DOGEBTC is 0.0002 BTC/DOGE, the calculated price would be:
[
\text{Calculated Price} = \frac{0.0002 \text{ BTC/DOGE}}{50,000 \text{ FDUSD/BTC}} = 0.000000004 \text{ FDUSD/DOGE}
]
This means you should sell DOGE at or above 0.000000004 FDUSD/DOGE to break even.
Step 3: Evaluate and Place the Limit Order:

Check the current ask price for DOGEFDUSD and determine the appropriate limit order price based on the following conditions.
Conditions:

Primary Condition:

Place a limit order at the current ask price for DOGEFDUSD.
Secondary Conditions:

If the current ask price < calculated price, place a limit order at the calculated price.
If the current ask price > calculated price, place a limit order at the current ask price.
Step 4: Monitor and Adjust the Order:

Check the status of the order every 3 seconds:
If the order gets filled before 3 seconds, the process ends.
If the order is not filled within 3 seconds, re-evaluate the current ask price:
If the current ask price ≤ last limit order price, do not cancel the order; continue to wait for it to get filled.
If the current ask price > last limit order price, cancel the existing order and place a new limit order at the updated current ask price, valid for another 3 seconds.
3. Summary:
This PRD outlines a strategy to execute a sell transaction for DOGEFDUSD while minimizing potential losses. By calculating a breakeven price from the executed prices of the first two transactions and placing a conditional limit order, the system ensures that the sell order is placed at a favorable price. Additionally, the order is monitored and dynamically adjusted to adapt to changing market conditions, thereby enhancing the trader’s chances of avoiding a loss.