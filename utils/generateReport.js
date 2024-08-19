const fs = require("fs").promises;
const path = require("path");

const { TRANSACTION_STATUS, UNIDENTIFIED } = require("../config/constants");
const logger = require("./logger");

function jsonToCsv(data, includeHeader) {
    const processId = data.processId || UNIDENTIFIED,
        currentTime = new Date(),
        set = data.set || UNIDENTIFIED,
        orderStatus = data.orderStatus || TRANSACTION_STATUS.REVERSED,
        symbols = data.transactions.map(tx => tx.symbol).join(","),
        sidesArray = data.transactions.map(tx => tx.side).join(","),
        cummulativeQtyArray = data.transactions.map(tx => tx.cummulativeQuoteQty || 0).join(","),
        executedQtyArray = data.transactions.map(tx => tx.executedQty || 0).join(","),
        executedPriceArray = data.transactions.map(tx => tx.executedPrice || 0).join(","),
        consumedTime = data.consumedTime;

    const csvHeader = "processId,currentTime,set,orderStatus,symbol1,symbol2,symbol3,symbol4,symbolR,side1,side2,side3,side4,sideR,cummulativeQty1,cummulativeQty2,cummulativeQty3,cummulativeQty4,cummulativeQtyR,executedQty1,executedQty2,executedQty3,executedQty4,executedQtyR,executedPrice1,executedPrice2,executedPrice3,executedPrice4,executedPriceR,consumedTime\n",
        csvRow = `${processId},${currentTime},${set},${orderStatus},${symbols},${sidesArray},${cummulativeQtyArray},${executedQtyArray},${executedPriceArray},${consumedTime}s\n`;

    return includeHeader? csvHeader + csvRow : csvRow;
}

async function saveDataToCsvFile(csvData, fileExists, filePath) {
    try {
        // Write the CSV data to the file, appending if it already exists
        if (fileExists) {
            await fs.appendFile(filePath, csvData);
        } else {
            await fs.writeFile(filePath, csvData);
        }
    } catch (error) {
        logger.error(`Error creating directory or writing file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function saveDataToCsv(data) {
    try {
        const rootDirectory = path.resolve(__dirname, ".."),
            directoryPath = path.join(rootDirectory, "csv-data");

        // Ensure the directory exists
        await fs.mkdir(directoryPath, { recursive: true });

        const filePath = path.join(directoryPath, "report.csv"),
            fileExists = await fs.access(filePath).then(() => true).catch(() => false);

        const csvData = jsonToCsv(data, !fileExists); // Include header if the file does not exist

        await saveDataToCsvFile(csvData, fileExists, filePath);
    } catch (error) {
        logger.error(`${data.processId} - Error saving data to CSV: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        throw error;
    }
}

async function generateReportInBackground(data) {
    try {
        await saveDataToCsv(data);
        logger.info(`${data.processId} - CSV file updated with new data`);
    } catch (error) {
        logger.error(`${data.processId} - Error generating CSV file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    }
}

async function generateReport(transactionDetail) {
    // No "await" since we do not wait to be blocked just for generating the report
    generateReportInBackground(transactionDetail);

    // Logging transaction detail for individual branch on terminal
    logger.info(`${transactionDetail.processId} - Report generation started for a sub-process; data - ${JSON.stringify(transactionDetail, null, 2)}`);
}

// Function to delete the report.csv file every 10 seconds
async function deleteCsvFilePeriodically() {
    const rootDirectory = path.resolve(__dirname, "..");
    const filePath = path.join(rootDirectory, "csv-data", "report.csv");

    setInterval(async () => {
        try {
            // Check if the file exists before attempting to delete
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);

            if (fileExists) {
                await fs.unlink(filePath);
                logger.info(`report.csv file deleted successfully`);
            }
        } catch (error) {
            logger.error(`Error deleting report.csv file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        }
    }, 3 * 24 * 60 * 60 * 1000); // Delete after 3 days
}

// Start the periodic deletion of the report.csv file
deleteCsvFilePeriodically();

module.exports = generateReport;
