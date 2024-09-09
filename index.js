const request = require('request');
const http = require('http');

// Fetch data from given url
function fetchData(url) {
    return new Promise((resolve, reject) => {
        request.get(url, (err, res) => {
            if (err) {
                return reject('Error fetching data: ' + err);
            }
            resolve(JSON.parse(res.body));
        });
    });
}

// Function to process transactions and find the winner, returns list of transaction id of winner
function findTopEarnerTransactions(transactions) {
    const currentYear = new Date().getFullYear();
    const userRecords = {};
    let winner = null;

    transactions.forEach(({ timeStamp, employee, amount, type, transactionID }) => {
        const year = new Date(timeStamp).getFullYear();

        if (year === currentYear - 1) {
            const empID = employee.id;

            if (!userRecords[empID]) {
                userRecords[empID] = { transactionIDs: [], sumAmount: 0 };
            }

            userRecords[empID].sumAmount += amount;

            if (type === 'alpha') {
                userRecords[empID].transactionIDs.push(transactionID);
            }

            if (!winner || winner.sumAmount < userRecords[empID].sumAmount) {
                winner = userRecords[empID];
            }
        }
    });

    return winner ? winner.transactionIDs : [];
}

// Function to post the result data
function postData(url, data) {
    return new Promise((resolve, reject) => {
        request.post({
            url: url,
            headers: { 'content-type': 'application/json' },
            body: data,
            json: true
        }, (err, res, body) => {
            if (err) {
                return reject('Error posting data: ' + err);
            }
            resolve({ statusCode: res.statusCode, body });
        });
    });
}

// Main function
async function executeTask(req, res) {
    try {
        const getTaskUrl = 'https://interview.adpeai.com/api/v2/get-task';
        const submitTaskUrl = 'https://interview.adpeai.com/api/v2/submit-task';

        const { transactions, id } = await fetchData(getTaskUrl);
        const result = findTopEarnerTransactions(transactions);

        const postResponse = await postData(submitTaskUrl, { id, result });

        console.log('Success:', postResponse.statusCode, postResponse.body);
        
        res.writeHead(postResponse.statusCode, { 'Content-Type': 'text/plain' });
        res.end(postResponse.body);
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
    }
}

const proxyServer = http.createServer(executeTask);

proxyServer.listen(80, () => {
    console.log('Proxy server running on http://localhost:80');
});
