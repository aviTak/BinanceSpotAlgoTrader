## Steps to Start the Project
1. To start your app in stage - npm run start
2. To start your app in prod - npm run start:prod
3. To stop the stage - npm run stop
4. To view logs - npm run logs
5. To view error logs - npm run logs:error
5. To delete process - npm run delete
6. To check status of processes - npm run status
7. To clean log and CSV files on Mac/Linux - npm run clean

## Count number of API calls in Logs
1. ABRACADABRA[PRICES] - No. of API calls to fetch prices
2. ABRACADABRA[ORDER] - No. of API calls to place an order
3. ABRACADABRA[CANCEL] - No. of API calls to cancel an order
4. ABRACADABRA[STATUS] - No. of API calls to check status of an order


## Useful Links

Merge CSV files online - https://merge-csv.com/

Logs Prettifier - https://beautifier.io/
                https://codebeautify.org/jsviewer

String to JSON - https://dadroit.com/string-to-json/

## Function 1

0. Fetch market price and bid/ask price to check if the condition is true.
1. If condition === true, place a limit order at bid/ask price and retry status check for next 2 seconds.
2. Limit GTC, Check status jaldi se jaldi.
3. Max 1 second mein pura ho gya toh aage badhao.
4. 1 second paar ho gya toh cancel the order. Jitna hua hai usko aage bhej do. And bacha hua 1 baar aur try karo price dobara fetch karke and condition check karke.
5. Ask price pe karna hai.


## Function 2 (Iss mein market price bhi nikalna hai bid/ask ke sath)

1. Condition 1 !== 1 --> Reverse at limit bid price. Wait for 1 second. Infinite attempts.
2. Condition 1 === 1 && Condition 2 === 1:-
    i. Limit GTC at Market Price and wait for 1 second (Same as function 1). Jo nahi hua (sum or all) voh next step pe jayega. Jo/jitna ho gya uss 1 second mein (or before) usse function 3 pe bhej deinge.
    ii. Limit GTC at bid/ask. Same as function 1 with 2 attempts. Otherwise reverse.
3. Varna reverse kar deinge.


## Function 3, 4 (Condition check nahi hogi; Reverse mein bhi nahi hogi)

1. Limit GTC at existing bid/ask price. Wait for 1 second.
2. Attempts infinite with new bid and ask price of coin three. Wait for 1 second.
    1. Complete/Partial - Next function for executed.
        Remaining quantity --> Same as nothing got filled (sum or all)
    2. Nothing - Wait for 1 second.

## FUNCTION R

1. Attempts infinite with new bid and ask price of coin three. Wait for 1 second.

## STEP 0

0. Account balance check karna hai.
1. Jab process start hoga toh function 1 price fetch karega and condtion calculate hogi aur change hogi. Coins beech mein change nahi kareinge yahin set kareinge. Same with buying pattern.
2. Condition ka kaam aage sirf reverse karne mein kaam aaeyga.


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
