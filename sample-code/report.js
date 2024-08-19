const fs = require("fs").promises;
const path = require("path");

const { TRANSACTION_STATUS } = require("../config/constants");
const logger = require("./logger");

function jsonToCsv(data) {
    const processId = data.processId || "UNIDENTIFIED",
        symbols = data.transactions.map(tx => tx.symbol).join(","),
        orderStatus = data.orderStatus || TRANSACTION_STATUS.REVERSED,
        sidesArray = data.transactions.map(tx => tx.side).join(","),
        cummulativeQtyArray = data.transactions.map(tx => tx.cummulativeQuoteQty || 0).join(","),
        executedQtyArray = data.transactions.map(tx => tx.executedQty || 0).join(","),
        executedPriceArray = data.transactions.map(tx => tx.executedPrice || 0).join(","),
        consumedTime = data.consumedTime;
        csvHeader = 'processId,orderStatus,symbol1,symbol2,symbol3,symbol4,symbolR,side1,side2,side3,side4,sideR,cummulativeQty1,cummulativeQty2,cummulativeQty3,cummulativeQty4,cummulativeQtyR,executedQty1,executedQty2,executedQty3,executedQty4,executedQtyR,executedPrice1,executedPrice2,executedPrice3,executedPrice4,executedPriceR,consumedTime\n',
        csvRow = `${processId},${orderStatus},${symbols},${sidesArray},${cummulativeQtyArray},${executedQtyArray},${executedPriceArray},${consumedTime}s\n`;

    return csvHeader + csvRow;
}

async function saveDataToCsvFile(csvData, processId) {
    try {
        const now = new Date(),
            timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}:${String(now.getMilliseconds()).padStart(3, "0")}`,
            rootDirectory = path.resolve(__dirname, ".."),
            directoryPath = path.join(rootDirectory, "data");

        // Ensure the directory exists
        await fs.mkdir(directoryPath, { recursive: true });

        // Use timestamp as the file name
        const fileName = `${processId}_${timestamp}.csv`,
            filePath = path.join(directoryPath, fileName);

        // Write the CSV data to a file
        await fs.writeFile(filePath, csvData);
    } catch (error) {
        logger.error(`${data.processId} - Error creating directory or writing file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function saveDataToCsv(data) {
    try {
        const csvData = jsonToCsv(data);

        await saveDataToCsvFile(csvData, data.processId);
    } catch(error) {
        logger.error(`${data.processId} - Error saving data to CSV: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function generateReportInBackground(data) {
    try {
        await saveDataToCsv(data);
        logger.info(`${data.processId} - CSV file generated for a branch`);
    } catch(error) {
        logger.error(`${data.processId} - Error generating CSV file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function generateReport(transactionDetail) {
    // No "await" since we do not wait to be blocked just for generating the report
    generateReportInBackground(transactionDetail);

    // Logging transaction detail for individual branch on terminal
    logger.info(`${transactionDetail.processId} - Report generation started for a sub-process`);
}

module.exports = generateReport;
