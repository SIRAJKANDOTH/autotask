const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/df57c5da4e444a4c94b362aeec143e9e")
let web3 = new Web3(provider);

const yieldster_ABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;

const BASE_URL = "http://localhost:8050";

exports.handler = async function () {
    let userList = await axios.get(`${BASE_URL}/user`)
    let userData;
    if (userList.data.status) {
        if ((userList.data.data).length > 0) {
            let userBalanceData = await Promise.all((userList.data.data).map(async (user) => {
                if ((user.depositedVaults).length > 0) {
                    userData = await Promise.all((user.depositedVaults).map(async (vault) => {
                        let contract = new web3.eth.Contract(yieldster_ABI, vault.vaultAddress);
                        let tokenPrice = await contract.methods.tokenValueInUSD().call();
                        let balance = await contract.methods
                            .balanceOf(user.accountAddress)
                            .call();
                        let currentValue = web3.utils.fromWei(tokenPrice) * web3.utils.fromWei(balance)
                        const userTransactionObject = {
                            accountAddress: user.accountAddress,
                            vaultAddress: vault.vaultAddress,
                            tokenBalance: web3.utils.fromWei(balance),
                            tokenPrice: web3.utils.fromWei(tokenPrice),
                            valueInUSD: currentValue
                        }
                        return userTransactionObject
                    }))
                } else return null
                return JSON.stringify(userData)
            }))
            console.log("userBalanceData: ", userBalanceData)
            let returnedData = await axios.post(`${BASE_URL}/defender/user-balance`, {
                userBalanceData
            })
            if (returnedData) {
                return returnedData.data.data
            } else {
                return "error"
            }
        } else {
            return "No users found"
        }
    } else {
        console.log("No vault Data")
        return "No vault Data"
    }
}