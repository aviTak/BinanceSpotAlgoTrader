const { v4: uuidv4 } = require("uuid");

const { CONDITION, TRANSACTION_DETAIL, FREQUENCY } = require("../config/constants");
const transaction1 = require("../transactions/transaction1");

// Individual slot
async function runSlot(slot, slotDuration, processId) {
    console.log(`Starting slot ${slot + 1}, Process ID: ${processId}`);

    const startSlotTime = Date.now();

    while (Date.now() - startSlotTime < slotDuration) {
        if (CONDITION === 1) {
            const transactionDetail = JSON.parse(JSON.stringify(TRANSACTION_DETAIL));

            transactionDetail.processId = processId;

            transaction1(transactionDetail, "10", false, (result) => {
                console.log('Parent received:', result);
            });

            return;
        }

        /*
            TODO: Will add this else case later

            await new Promise(resolve => setTimeout(resolve, 1000));
        */
    }

    console.log(`Condition not met for slot ${slot + 1}, Process ID: ${processId}, skipping process.`);
}

// Main loop to continuously run the code
async function mainLoop(frequency) {
    const slotDuration = (60 / frequency) * 1000;

    while (true) { // Infinite loop to keep running indefinitely
        const iterationId = uuidv4();

        for (let slot = 0; slot < frequency; slot++) {
            const slotStartTime = Date.now();

            // No "await" since we do not wait to be blocked even if the previous process is still in execution
            runSlot(slot, slotDuration, iterationId);

            // return; // Will remove after testing

            const elapsed = Date.now() - slotStartTime,
                waitTime = slotDuration - elapsed;

            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime)); // Wait the remaining time in the slot duration
            }
        }
        return; // Will remove after testing
    }
}

mainLoop(FREQUENCY).catch(error => console.error("Code crashed", error));
