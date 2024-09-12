const { v4: uuidv4 } = require("uuid");
const { performance } = require("perf_hooks");

const { TRANSACTION_TEMPLATE } = require("./config/constants");
const transaction1 = require("./transactions/transaction1");
const logger = require("./utils/logger");

const WAIT_TIME = 1000; // Time in ms

// Infinite loop to keep running indefinitely
async function mainLoop() {
    const transactionDetail = JSON.parse(JSON.stringify(TRANSACTION_TEMPLATE));

    while (true) {
        const processId = uuidv4(); // Unique ID of each tree

        transactionDetail["processId"] = processId;
        transactionDetail["consumedTime"] = new Date();

        const start = performance.now(); // Start timer

        try {
            await transaction1(transactionDetail);
            logger.info(`${processId} processId cycle complete`);
        } catch (error) {
            logger.error(`${processId} processId cycle failed: ${error}`);
        } finally {
            const end = performance.now(), // End timer
                timeTaken = ((end - start) / 1000).toFixed(2);

            logger.info(`Time taken by ${processId}: ${timeTaken}s`);

            if (timeTaken < 1) { // Time in seconds
                await new Promise(resolve => setTimeout(resolve, WAIT_TIME)); // Wait and then restart
            }

            /* Uncomment the return statement below to run only a single process */
            return;
        }
    }
}

mainLoop().catch(error => logger.error(`Code crashed: ${error}`));
