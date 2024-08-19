/* Code Snippet for changing waiting time */

transaction1(transactionDetail)
    .then(() => {
        const end = performance.now(), // End timer
            timeTaken = ((end - start) / 1000).toFixed(2);

        logger.info(`${processId} processId cycle complete`);
        logger.info(`Time taken by ${processId}: ${timeTaken}s`);
    })
    .catch((error) => {
        logger.error(`${processId} processId cycle failed: ${error}`);
    });

await new Promise(resolve => setTimeout(resolve, 1000));
