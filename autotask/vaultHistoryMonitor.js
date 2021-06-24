const axios = require('axios')
const Web3 = require("web3");
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/df57c5da4e444a4c94b362aeec143e9e")
let web3 = new Web3(provider);

const APSAddress = "0x400272944fCf2A43591C5cE2a60d239AacbFED5F";
const PRICE_MODULE = "0x7DC54c1c19db05f0127CE53cE33304b4835eC41A";

const ERC20Detailed = require("yieldster-abi/contracts/ERC20Detailed.json").abi;
const yieldsterVault = require('yieldster-abi/contracts/YieldsterVault.json');
const APContract = require('yieldster-abi/contracts/APContract.json');
const IStrategy = require('yieldster-abi/contracts/IStrategy.json');
const ERC20 = require('yieldster-abi/contracts/ERC20.json');


exports.handler = async function () {
    try {
        const erc20ABI = ERC20.abi;
        const apsContractABI = APContract.abi;
        const strategyContractABI = IStrategy.abi;
        const safeContractABI = yieldsterVault.abi;

        let assetHisoryDataObject = {};

        let aps = new web3.eth.Contract(apsContractABI, APSAddress);

        const assets = await axios.get(`http://52.203.100.234:8050/asset`)
        const strategyList = await axios.get(`http://52.203.100.234:8050/strategy`)

        if (assets.data && strategyList.data.data) {
            const yieldsterAssets = (assets.data).filter(x => {
                return x.isProtocolToken == false
            })
            const protocolAssets = (assets.data).filter(x => {
                return x.isProtocolToken == true
            })

            const strategyTokens = (strategyList.data.data)

            // To keep track of stable coins
            let currentAssetPrices = await Promise.all(yieldsterAssets.map(async (element) => {
                try {
                    let obj = {};
                    let assetPrice = await aps.methods.getUSDPrice(element.assetAddress).call()
                    let erc20 = new web3.eth.Contract(ERC20Detailed, element.assetAddress)
                    obj.assetAddress = element.assetAddress;
                    obj.assetId = element._id;
                    obj.assetPrice = web3.utils.fromWei(assetPrice)
                    obj.assetIcon = element.assetIcon;
                    obj.assetName = element.assetName;
                    obj.assetSymbol = element.assetSymbol;
                    obj.decimal = await erc20.methods.decimals().call();
                    return obj;
                } catch (error) {
                    console.log(`Error occured while tracking stable coins: ${error}`)
                }
            }));

            // To keep track of the strategy tokens
            let strategyAssetPrice;
            if (strategyTokens.length) {
                strategyAssetPrice = await Promise.all(strategyTokens.map(async (strategyToken) => {
                    try {
                        let obj = {}
                        let strategyContract = new web3.eth.Contract(strategyContractABI, strategyToken.strategyAddress)
                        let erc20 = new web3.eth.Contract(ERC20Detailed, strategyToken.strategyAddress)
                        let strategyTokenPrice = await strategyContract.methods.tokenValueInUSD().call()
                        obj.assetAddress = strategyToken.strategyAddress;
                        obj.assetPrice = web3.utils.fromWei(strategyTokenPrice)
                        obj.assetName = await erc20.methods.name().call();
                        obj.assetSymbol = await erc20.methods.symbol().call();
                        obj.decimal = await erc20.methods.decimals().call();
                        return obj;
                    } catch (error) {
                        console.log(`Error occured at strategy token price tracker${error.message}`)
                    }
                }))
            }
            // To keep track of the protocol assests
            if (protocolAssets.length) {
                let protocolAssetPrice = await Promise.all(protocolAssets.map(async (asset) => {
                    try {
                        let obj = {}
                        let transaction = {
                            to: PRICE_MODULE, //Calling the price module to get the current token price of the tokens added to the contract
                            data: web3.eth.abi.encodeFunctionCall({
                                name: 'getUSDPrice',
                                type: 'function',
                                inputs: [{
                                    type: 'address',
                                    name: '_tokenAddress'
                                }]
                            }, [asset.assetAddress])
                        }
                        const res = await web3.eth.call(transaction)
                        if (res) {
                            let result = web3.eth.abi.decodeParameters(['uint256'], res)
                            let erc20 = new web3.eth.Contract(ERC20Detailed, asset.assetAddress)
                            obj.assetAddress = asset.assetAddress;
                            obj.assetId = asset._id;
                            obj.assetPrice = web3.utils.fromWei(result[0])
                            obj.assetName = asset.assetName;
                            obj.assetSymbol = asset.assetSymbol;
                            obj.decimal = await erc20.methods.decimals().call();
                            return obj;
                        } else {
                            console.log('an error has occured')
                        }
                    } catch (err) {
                        console.log(`Error occured at protocol price tracker${err.message}`)
                    }
                }));
                if (strategyAssetPrice.length) {
                    let assetDataObject = [...currentAssetPrices, ...protocolAssetPrice, ...strategyAssetPrice]
                    assetHisoryDataObject.assetData = assetDataObject;
                } else {
                    let assetDataObject = [...currentAssetPrices, ...protocolAssetPrice]
                    assetHisoryDataObject.assetData = assetDataObject;
                }
            } else {
                assetHisoryDataObject.assetData = currentAssetPrices
            }
            const vaults = await axios.get(`http://52.203.100.234:8050/vault`)
            if ((vaults.data.data).length > 0) {
                let safeDetails = await Promise.all((vaults.data.data).map(async (vault) => {
                    try {
                        let safeObject = {};
                        let safe = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
                        let safeTokenPrice = await safe.methods.tokenValueInUSD().call();

                        safeObject.vaultAddress = vault.vaultAddress;
                        safeObject.assetName = vault.tokenName;
                        safeObject.safeTokenPrice = safeTokenPrice;
                        // cannot read protocol token in depositable/withdrawableAssets
                        let safeDepositWithdrawTokens = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]
                        // To get the assets balances of the vault
                        let tokenBalancesOfSafe = await Promise.all(safeDepositWithdrawTokens.map(async (token) => {
                            let retObj = {};
                            let protocolContract = new web3.eth.Contract(erc20ABI, token);
                            let balanceOfAsset = await protocolContract.methods.balanceOf(vault.vaultAddress).call();
                            retObj.tokenAddress = token;
                            retObj.tokenBalanceInSafe = balanceOfAsset;
                            return retObj;
                        }));
                        // To get the strategy token balance of the vault
                        let strategyTokenBalanceOfSafe = await Promise.all(strategyTokens.map(async (token) => {
                            let obj = {}
                            let strategyContract = new web3.eth.Contract(strategyContractABI, token.strategyAddress)
                            let safeBalance = await strategyContract.methods.balanceOf(vault.vaultAddress).call()
                            obj.tokenAddress = token.strategyAddress;
                            obj.tokenBalanceInSafe = safeBalance;
                            return obj;
                        }));

                        if (strategyTokenBalanceOfSafe) {
                            safeObject.tokenBalanceInSafe = [...tokenBalancesOfSafe, ...strategyTokenBalanceOfSafe]
                        } else {
                            safeObject.tokenBalanceInSafe = tokenBalancesOfSafe;
                        }
                        return safeObject;
                    } catch (error) {
                        console.log(`Error occured in tracking vault details: ${error}`)
                    }
                }));
                assetHisoryDataObject.vaults = safeDetails;
            }
            assetHisoryDataObject.blockNumber = await web3.eth.getBlockNumber();
            console.log(assetHisoryDataObject)
        }
    } catch (error) {
        console.log(`An error has occurred.${error}`)
    }
}