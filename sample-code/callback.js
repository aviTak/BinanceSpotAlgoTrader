 // Run both transactions without waiting for both to complete

 transaction2(transactionDetail, "2")
 .then(result => {
     callback(result);
     return result;
 })
 .catch(err => {
     console.error('Error in transaction2:', err);
 });

transaction1(transactionDetail, "1", true)
 .then(result => {
     callback(result);
     return result;
 })
 .catch(err => {
     console.error('Error in transaction1:', err);
 });

transaction1(transactionDetail, "10", false, (result) => {
    console.log('Parent received:', result);
});