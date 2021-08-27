require('dotenv').config();

const axios = require('axios');
const key = "";
const Web3 = require('web3');
// const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
const provider = new Web3.providers.WebsocketProvider("ws://localhost:8545");
const BASE_URL = "https://api.yieldster.finance";
// const BASE_URL = "http://localhost:8050";
const etherscanAPIKey = "EPZKUNTQJSRTD1RTVHVIF6AWJF4FP3FJZY";

let web3 = new Web3(provider);

const sendTransaction = async (txData, from, to, estimatedGas, safeaddress,relayerAddress) => {
    try {
        const tx = {
            from,
            to,
            gas: estimatedGas,
            data: txData,
        };
        let signedTxn = await web3.eth.accounts.signTransaction(
            tx,
            key
        );
        let txn = web3.eth.sendSignedTransaction(signedTxn.raw || signedTxn.rawTransaction);
        let currentGasPriceInWEI = web3.utils.toWei(((await axios.get(`https://api.etherscan.io/api/?module=gastracker&action=gasoracle&apikey=${etherscanAPIKey}`)).data.result.FastGasPrice).toString(), 'gwei');
        // let currentGasPriceInWEI = await web3.eth.getGasPrice(); // UNCOMMENT IN PRODUCTION

        let body = {
            safeaddress,
            gasPrice: currentGasPriceInWEI,
            gascosts:estimatedGas,
            executor:relayerAddress,
            transactionHash:signedTxn.transactionHash
        }
        let setTxnCost = await axios.post(`${BASE_URL}/defender/savetxncost`, body)
        console.log(body)
        // return { status: true, txn: signedTxn.transactionHash };
        return { status: true, txn: signedTxn.transactionHash };

    } catch (error) {
        console.log(error)
        return { status: false, error }
    }
}
