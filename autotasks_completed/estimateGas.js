const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
// const provider = new Web3.providers.WebsocketProvider("ws://localhost:8545");

let web3 = new Web3(provider);

const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const axios = require('axios')
const etherscanAPIKey = "EPZKUNTQJSRTD1RTVHVIF6AWJF4FP3FJZY";

let estimateGas = async (from, to, data) => {
    try {
        let txnObject = {
            from,
            to,
            data
        };
        let estGas = await web3.eth.estimateGas(txnObject);
        console.log("estGs:", estGas)
        return estGas;
    } catch (error) {
        console.log(error)
    }

}

let getGasUsedInUSD = async (gasUsed) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let oneEtherInWEI = await priceModule.methods.getLatestPrice('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419').call();
        let oneEtherInUSD = oneEtherInWEI[0] / (10 ** 8)
        // let currentGasPriceInWEI = await web3.eth.getGasPrice(); // UNCOMMENT IN PRODUCTION
        let currentGasPriceInWEI = web3.utils.toWei(((await axios.get(`https://api.etherscan.io/api/?module=gastracker&action=gasoracle&apikey=${etherscanAPIKey}`)).data.result.FastGasPrice).toString(), 'gwei');
        let gasUsedInUSD = (currentGasPriceInWEI * gasUsed * oneEtherInUSD) / (10 ** 18)
        console.log(currentGasPriceInWEI,oneEtherInUSD,gasUsed)
        console.log('gasUsedInUSD',gasUsedInUSD)
        return gasUsedInUSD;
    } catch (error) {
        console.log(error)
        throw error;
    }

}

let gasUsed = estimateGas('0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0', '0x7573E53adeC374AEe7BD63f7d33e456EAcd10631',
 '0x308bdf1100000000000000000000000002fb737b01dd3dfc4ef006969b4211487afdd06a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000007604670000000000000000000000000000000000000000000000000000000000000001600000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000076046700000000000000000000000000000000000000000000000056c114334edaad4d400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
let gasCost = getGasUsedInUSD('1828030');
// console.log("GasCost: ", gasCost)