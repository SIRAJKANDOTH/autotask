const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/df57c5da4e444a4c94b362aeec143e9e")
let web3 = new Web3(provider);

const yieldster_ABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;

const BASE_URL = "http://localhost:8050";

exports.handler = async function () {
    let vaults = await axios.get(`${BASE_URL}/vault`)
    if (vaults.data.status) {
        let vaultData = await Promise.all((vaults.data.data).map(async (data) => {
            let contract = new web3.eth.Contract(yieldster_ABI, data.vaultAddress);
            let vaultNAV = await contract.methods.getVaultNAV().call();
            let tokenPrice = await contract.methods.tokenValueInUSD().call();
            let block = await web3.eth.getBlockNumber();
            return ({
                vaultNAV: vaultNAV,
                tokenPrice: web3.utils.fromWei(tokenPrice),
                blockNumber: block,
                vaultAddress: data.vaultAddress
            })
        }))
        let returnedData = await axios.post(`${BASE_URL}/defender/vault-nav`, {
            vaultData
        })
        if (returnedData) {
            return returnedData.data.data
        } else {
            return "No data"
        }
    } else {
        return "No vault Data"
    }
}