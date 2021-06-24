const axios = require('axios')
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/f282de0c6571487aa01db622d6949517");
let web3 = new Web3(provider);
const yieldster_ABI = require('yieldster-abi/contracts/YieldsterVault.json').abi


exports.handler = async function () {    
    let vaults = await axios.get(`http://52.203.100.234:8050/vault`)
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
        console.log("return data: ", vaultData)
        let returnedData = await axios.post(`http://52.203.100.234:8050/test/navdata`, {
            vaultData
        })
        if (returnedData) {
           return returnedData.data.data
        } else {
            console.log("No data")
        }
    } else {
        console.log("No vault Data")
    }
}