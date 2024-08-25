## Binance Docs
1. [Setting up Testnet and Postman](https://www.binance.com/en/blog/ecosystem/binance-api-spot-trading-with-postman-2584865726555369951)
2. [Binance Spot API Documentation](https://docs.binance.us/#introduction)

## Steps to Start the Project
1. To start your app in stage - npm run start
2. To start your app in prod - npm run start:prod
3. To stop the stage - npm run stop
4. To view logs - npm run logs
5. To view error logs - npm run logs:error
5. To delete process - npm run delete
6. To check status of processes - npm run status
7. To clean log and CSV files on Mac/Linux - npm run clean

---

## Count number of API calls in Logs
1. COUNT[PRICES] - No. of API calls to fetch prices
2. COUNT[ORDER] - No. of API calls to place an order
3. COUNT[CANCEL] - No. of API calls to cancel an order
4. COUNT[STATUS] - No. of API calls to check status of an order

---


## Useful Links

Merge CSV files online - https://merge-csv.com/

Logs Prettifier - https://beautifier.io/
                https://codebeautify.org/jsviewer

String to JSON - https://dadroit.com/string-to-json/

---

## Transaction 1

1. **Fetch Market and Bid/Ask Prices**:
   - Fetch the current market price and bid/ask prices for the relevant cryptocurrency pairs.
   - The purpose is to check if the condition for profitability is met.

2. **Condition Check**:
   - If the calculated condition is true, place a limit order at the bid or ask price.
   - Immediately start checking the order status for the next 2 seconds.

3. **Order Placement and Status Check**:
   - Place a **Limit GTC (Good 'Til Canceled)** order.
   - Check the status as quickly as possible.

4. **Order Execution**:
   - If the order is fully executed within 1 second, proceed to the next transaction.
   - If the order isn't filled within 1 second, cancel the order. Forward any partially filled quantity to the next step.
   - Re-attempt the remaining quantity by fetching the price again, checking the condition, and placing the order if appropriate.

5. **Ask Price Execution**:
   - Ensure that the limit order is placed at the ask price during this transaction.

---

## Transaction 2

1. **Initial Setup and Price Fetching**:
   - Fetch both the market price and bid/ask prices, similar to transaction 1.

2. **Condition Handling**:
   - **Condition 1 is False**:
     - If the primary condition is not met, reverse the trade at the limit bid price. Retry infinitely with a 1-second wait between each attempt.
   - **Condition 1 is True and Condition 2 is True**:
     - Place a **Limit GTC** order at the market price and wait for 1 second.
     - Any quantity not executed in 1 second moves to the next step, while executed quantity proceeds to transaction 3.
     - Place a **Limit GTC** order at the bid/ask price and follow the same procedure as in transaction 1, with up to 2 attempts. If unsuccessful, reverse the transaction.

3. **Reverse Handling**:
   - If neither condition is met, reverse the transaction using the defined logic.

---

## Transaction 3 and Transaction 4

1. **Order Placement**:
   - Place a **Limit GTC** order at the current bid/ask price.
   - Wait for 1 second for the order to fill.

2. **Handling Multiple Attempts**:
   - Continue attempting the order indefinitely with new bid and ask prices for the third cryptocurrency pair.
   - Wait for 1 second between each attempt.

3. **Order Execution Handling**:
   - If the order is partially or fully executed, proceed with the executed quantity to the next transaction.
   - If nothing is filled, wait for 1 second and reattempt.

4. **Transaction 4 and ReverseTransaction1**:
   - **Transaction 4** uses the same logic as described above for placing and monitoring orders.
   - **ReverseTransaction1** specifically reverses the order made in transaction 1, following the same logic and conditions as in transaction 4.

5. **Final Checks**:
   - Each transaction continuously monitors the order status. If the order is fully executed, the transaction is completed.
   - If the order isn't fully filled within the allowed time, it will be canceled, and the remaining quantity will be reattempted.

6. **Handling Partial Executions**:
   - If an order is only partially filled, the executed portion proceeds to the next transaction.
   - The remaining quantity is reattempted under the same conditions.

7. **Infinite Attempts**:
   - For transactions 3, 4, and ReverseTransaction1, attempts to execute the order continue indefinitely until the order is filled.

---


## Block A - Agar 90% ho jaata hai toh restart the complete process (500 ya minimum balance lga do)

1. 500 --> 440 aa gya --> Process bhi complete ho gya --> Restart the process.
2. 500 --> 450 jab bhi ho jayega --> Restart the process.
3. 90% amount ho gayi hai toh dobara fir se 10% ke liye nahi chalna hai.


*Email bhejna hoga --> Use Nodemailer*


## Three Ways to Restart the Process:-

1. Jab eik khatam hoga pura process toh hi agla process start hoga.
2. Block A.
3. We will restart the process every second (kuch ho na ho).

## Explanation for executedQty vs cummulativeQuoteQty for buy and sell orders

**Buy hai toh pehla vala bhejo (executedQty) aur sell hai toh dusra vala bhejo**

ETHUSDT, ETHBTC || QTUMETH

[
    {
        symbol: "ETHUSDT",
        price: "100",
        side: "BUY"
    },
    {
        symbol: "ETHBTC",
        price: "0.5"
        side: "SELL"
    },
    {
        symbol: "QTUETH",
        price: "2"
        side: "BUY"
    }
]


Step 1 BUY --> quantity nikalni padegi
10 USDT se 0.1 ETH buy kiya
quantity = 10 / price

Step 2 Case 1 SELL --> quantity same hai
0.1 ETH sell kar dena hai uss se 0.05 BTC mila
quantity = 0.1

Step 2 Case 2 BUY --> quantity nikalni padegi
0.1 ETH se 0.05 QTU liya
quantity = 0.1 / price

## Formula Format for Conditions

(mp1+mp2+mp3+mp4)/(ap1*bp1+ap2*bp2+ap3*bp1+ap1*bp1)

0-10 --> [AIUSDT|BUY, AI......]
11-20 --> [BTCUSDT,..]
21-30 --> [BTCUSDT,...]

**Eik hi coin pair 2 alag-alag (kahin buy-kahin sell) position/function pe ho sakta hai (in that case there are 3 coin pairs instead of 4)**
