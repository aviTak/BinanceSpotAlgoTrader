Merge CSV files online - https://merge-csv.com/

Logs Prettifier - https://beautifier.io/
                https://codebeautify.org/jsviewer

String to JSON - https://dadroit.com/string-to-json/

Command to delete log and csv files:-
1. Macintosh: rm -rf csv-data log-files
2. Windows: rmdir /s /q csv-data && rmdir /s /q log-files

Logic for changing the price:-
0.530000 --> 0.530001 || 0.529999

Explanation for sub-nodes in function 3:-

Sub-Node 1 --> Original Price pe IOC
Sub-Node 2 --> Changed Price pe IOC
Sub-Node 3 --> Market Price

yeh dekhna hai ki saare attempts khatam ho gaye toh dusre sub-node pe kaise jayega


Explanation for how we are handling quantity vs quoteOrderQty for buy and sell orders:-

usdt/x -> sell - usdt pta hai -> quantity dalegi -> price not required in MO
usdt/x -> buy - x pta hai -> quantity nikalegi price se -> market order ke liye quoteOrderQty chal jayegi and price nikane ki zaroorat nahi

market buy - no need to calculate fees
x/usdt -> buy - usdt pta hai -> quantity nikalegi price se -> market order ke liye quoteOrderQty chal jayegi and price nikane ki zaroorat nahi
x/usdt -> sell - x pta hai -> quantity dalegi -> price not required in MO


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


Step 1 BUY --> quantity nikali padegi
10 USDT se 0.1 ETH buy kiya
quantity = 10 / price

Step 2 Case 1 SELL --> quantity same hai
0.1 ETH sell kar dena hai uss se 0.05 BTC mila
quantity = 0.1

Step 2 Case 2 BUY --> quantity nikalni padegi
0.1 ETH se 0.05 QTU liya
quantity = 0.1 / price


Details we need to fetch and update in each transaction:-

func getOrderInfo(index --> (transactionDetailfunctionNo - 1))
For every transaction we need to fetch - symbol, side, price, and precision of that function number

func updateTransactionDetail(index --> (functionNo - 1))
When that order is successfully placed, we need to update/<return> - cummulativeQuoteQty, executedQty, and executedPrice of that function number


Response returned when an order is placed:-

Order "status" - FILL, EXPIRED, PARTIAL

For reverse order, we will delete that entry from TRANSACTION_DETAIL array and also the further array values and add a status - "Reversed on market order"

Function 1

0. Fetch price --> condition === 1 toh code chalega varna retry after 1 second.
1. Limit GTC, Check status jaldi se jaldi.
2. Max 1 second mein pura ho gya toh aage badhao.
3. 1 second paar ho gya toh cancel the order. Jitna hua hai usko aage bhej do. And bacha hua 1 baar aur try karo price dobara fetch karke and condition check karke.
4. Ask price pe karna hai.


Function 2

1. Condition 1 !== 1 --> Reverse at limit bid price. Wait for 1 second. Infinite attempts.
2. Condition 1 === 1 && Condition 2 === 1 --> Limit GTC at bid/ask. Same as function 1 with 2 attempts. Otherwise reverse.

Function 3 & 4 (Condition check nahi hogi; Reverse mein bhi nahi hogi)

1. Limit GTC at existing price. Wait for 1 second. Attempts infinite with new bid and ask price of coin three.


STEP 0

0. Account balance check karna hai.
1. Jab process start hoga toh function 1 price fetch karega and condtion calculate hogi aur change hogi. Coins beech mein change nahi kareinge yahin set kareinge. Same with buying pattern.
2. Condition ka kaam aage sirf reverse karne mein kaam aaeyga.

---------------------------------------------------------------------------------------------------------------


Agar 90% ho jaata hai toh restart the complete process (500 ya minimum balance lga do)

1. 500 --> 440 aa gya --> Process bhi complete ho gya --> Restart the process.
2. 500 --> 450 jab bhi ho jayega --> Restart the process.
3. 90% amount ho gayi hai toh dobara fir se 10% ke liye nahi chalna hai.


Email bhejna hoga
