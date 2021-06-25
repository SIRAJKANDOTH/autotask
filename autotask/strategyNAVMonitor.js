const axios = require('axios');

const Web3 = require("web3");
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/df57c5da4e444a4c94b362aeec143e9e")
let web3 = new Web3(provider);

const IStrategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;

const BASE_URL = "http://localhost:8050";

exports.handler = async function () {
    const strategies = await axios.get(`${BASE_URL}/strategy`)
    if (strategies.data.status) {
        let strategyNAVList = await Promise.all((strategies.data.data).map(async (strategy) => {
            let contract = new web3.eth.Contract(IStrategyABI, strategy.strategyAddress)
            let strategyNAV = await contract.methods.getStrategyNAV().call()
            let strategyTokenPrice = await contract.methods.tokenValueInUSD().call()
            let blockNumber = await web3.eth.getBlockNumber();

            const strategyNAVHistoryObject = {
                strategyAddress: strategy.strategyAddress,
                strategyNAV: strategyNAV,
                strategyTokenPrice: strategyTokenPrice,
                blockNumber: blockNumber,
            }
            return strategyNAVHistoryObject
        }))
        let returnData = await axios.post(`${BASE_URL}/defender/strategy-nav`, strategyNAVList);
        if (returnData.data.status) {
            console.log(returnData.data.data)
            return returnData.data.data
        } else {
            console.log("error occured while adding record")
        }
    } else {
        console.log("Strategy not found")
    }
}