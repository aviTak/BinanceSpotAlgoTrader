Below is a detailed `.md` file explaining the logic, formulas, and conditions used in `transaction1`.

---

# Detailed Logic Explanation of Formulas and Conditions in Transaction 1

## Overview

`Transaction1` is the first step in a series of trades designed to exploit potential arbitrage opportunities between three cryptocurrency pairs: `BTCFDUSD`, `DOGEBTC`, and `DOGEFDUSD`. The goal is to determine whether executing trades in the original order (Set A) or the reverse order (Set B) is more profitable. This document details the logic behind the formulas and conditions used to make that determination.

## Trading Pairs Involved

1. **BTCFDUSD**: Trading Bitcoin (BTC) against FDUSD (a stablecoin).
2. **DOGEBTC**: Trading Dogecoin (DOGE) against Bitcoin (BTC).
3. **DOGEFDUSD**: Trading Dogecoin (DOGE) against FDUSD.

## Formulas Used

### **Formula 1**
```javascript
formula1 = (bidArray[2] / marketArray[1]) / askArray[0] - 1
```

**Explanation:**
- **`bidArray[2]`:** The bid price of the `DOGEFDUSD` pair (the price at which you can sell DOGE for FDUSD).
- **`marketArray[1]`:** The market price of the `DOGEBTC` pair (the price at which DOGE can be traded for BTC).
- **`askArray[0]`:** The ask price of the `BTCFDUSD` pair (the price at which you can buy BTC using FDUSD).

**Logic:**
- This formula calculates the profitability of converting FDUSD to BTC, BTC to DOGE, and then DOGE back to FDUSD.
- **Step-by-Step:**
  1. **Convert DOGE to FDUSD:** The bid price (`bidArray[2]`) gives you the amount of FDUSD you can get for DOGE.
  2. **Convert DOGE to BTC:** The market price (`marketArray[1]`) is used to determine how much BTC you would get if you first converted DOGE to BTC.
  3. **Convert BTC to FDUSD:** The ask price (`askArray[0]`) tells you how much FDUSD you would need to buy BTC.
  4. **Calculate Profitability:** By dividing the above values and subtracting 1, you determine if the trade yields a profit (positive value) or a loss (negative value).

**Purpose:**
- **Formula 1** is used to evaluate the profitability of the original trading sequence (Set A).

### **Formula 2**
```javascript
formula2 = (marketArray[1] * bidArray[0]) / askArray[2] - 1
```

**Explanation:**
- **`marketArray[1]`:** The market price of the `DOGEBTC` pair (the price at which DOGE can be traded for BTC).
- **`bidArray[0]`:** The bid price of the `BTCFDUSD` pair (the price at which you can sell BTC for FDUSD).
- **`askArray[2]`:** The ask price of the `DOGEFDUSD` pair (the price at which you can buy DOGE using FDUSD).

**Logic:**
- This formula calculates the profitability of converting DOGE to BTC, BTC to FDUSD, and then FDUSD to DOGE (essentially reversing the trades).
- **Step-by-Step:**
  1. **Convert DOGE to BTC:** The market price (`marketArray[1]`) gives you the amount of BTC you can get for DOGE.
  2. **Convert BTC to FDUSD:** The bid price (`bidArray[0]`) gives you the amount of FDUSD you can get for BTC.
  3. **Convert FDUSD to DOGE:** The ask price (`askArray[2]`) tells you how much FDUSD you would need to buy DOGE.
  4. **Calculate Profitability:** By multiplying the values, dividing, and subtracting 1, you determine if the trade yields a profit or loss.

**Purpose:**
- **Formula 2** is used to evaluate the profitability of the reverse trading sequence (Set B).

## Condition Check
```javascript
condition = parseFloat(0.11 / 122)
```

**Explanation:**
- This is a small threshold value used as a minimum acceptable profit margin. It ensures that trades are only executed if they exceed a certain profitability level.

**Purpose:**
- To prevent the execution of trades that have negligible or potentially unprofitable margins. The `condition` value acts as a safeguard against risky trades with low returns.

## Logic for Set Selection

```javascript
if (formula2 < formula1 && formula1 >= condition) { // Set A
    // Execute the original order
} else if (formula1 < formula2 && formula2 >= condition) { // Set B
    // Execute the reverse order
}
```

**Explanation:**

1. **First Condition (`formula2 < formula1 && formula1 >= condition`):**
   - **`formula2 < formula1`:** Checks if the original trading sequence (Set A) is more profitable than the reverse sequence (Set B).
   - **`formula1 >= condition`:** Ensures that the profit from Set A meets or exceeds the minimum acceptable profit margin.

   **Outcome:**
   - If both conditions are true, execute **Set A** (the original order) because it is the more profitable and viable option.

2. **Second Condition (`formula1 < formula2 && formula2 >= condition`):**
   - **`formula1 < formula2`:** Checks if the reverse trading sequence (Set B) is more profitable than the original sequence (Set A).
   - **`formula2 >= condition`:** Ensures that the profit from Set B meets or exceeds the minimum acceptable profit margin.

   **Outcome:**
   - If both conditions are true, execute **Set B** (the reverse order) because it is the more profitable and viable option.

**Purpose:**
- This logic is used to dynamically select the most profitable trading sequence based on real-time market data. By comparing the two potential profit margins, the system ensures that the trade with the highest return is executed.

## Conclusion

The logic in `Transaction1` is designed to evaluate the profitability of two potential trading sequences: the original order (Set A) and the reverse order (Set B). By calculating potential profit margins using **Formula 1** and **Formula 2**, and comparing these margins against a minimum profit threshold (`condition`), the system intelligently decides which sequence to execute. This approach maximizes profit while minimizing risk, making it a crucial component of an effective high-frequency trading strategy.

---

This `.md` file provides a comprehensive explanation of the logic, formulas, and conditions used in `Transaction1`. It can serve as documentation for anyone looking to understand or contribute to the project.
