const {
    Relayer
} = require('defender-relay-client');
const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
// const provider = new Web3.providers.WebsocketProvider("ws://localhost:8545");

let web3 = new Web3(provider);

const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20Detailed.json').abi;

const CRV3Pool = require("yieldster-abi/contracts/curve3pool.json").abi;

const livaOneMinter = "0x7573E53adeC374AEe7BD63f7d33e456EAcd10631";
const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const relayerAddress = "0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0";

const BASE_URL = "https://api.yieldster.finance";
const etherscanAPIKey = "EPZKUNTQJSRTD1RTVHVIF6AWJF4FP3FJZY";
const crv3poolAddress = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const livaOne = "0x2747ce11793f7059567758cc35d34f63cee8ac00";
const threshold = 0;
const minimumInvestmentDuration = 7;
const strategyPortfolio = 0.5;
const slippage = 0.01;
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const minimumThresholdForDeposit = 0;

const getPriceInUsd = (assetBalance, assetDecimals, assetPriceInUSD) => {
    return web3.utils.toWei(((assetBalance / (10 ** assetDecimals)) * web3.utils.fromWei(assetPriceInUSD.toString())).toString())
}

const getAmountToInvest = (vaultNAV, vaultNAVWithoutStrategy, ocbPercentage) => {
    let optimalSafeBalance = (web3.utils.fromWei(vaultNAV) * (ocbPercentage));
    console.log('optimalSafeBalance', optimalSafeBalance)
    console.log('vaultNAVWithoutStrategy', web3.utils.fromWei(vaultNAVWithoutStrategy))
    if (web3.utils.fromWei(vaultNAVWithoutStrategy) > optimalSafeBalance)
        return web3.utils.toWei(((web3.utils.fromWei(vaultNAVWithoutStrategy) - optimalSafeBalance)).toLocaleString('fullwide', { useGrouping: false }))
    else
        return 0
}


const assetProportions = async (args) => {
    try {
        let { assetArr, nonCrvBaseAssetArr, amountToInvest } = args;
        let crvPoolAssets = [DAI, USDC, USDT];
        const crvAssetsMapping = new Map();
        const nonCrvBaseAssetsMapping = new Map();
        let crvPoolAssetsObj = (assetArr.filter(element => crvPoolAssets.indexOf(web3.utils.toChecksumAddress(element.assetAddress)) != -1).map((element) => {
            let retobj = {};
            if (web3.utils.fromWei(amountToInvest.toString()) > 0 || web3.utils.fromWei(amountToInvest.toString()) !== '0') {
                if (web3.utils.fromWei(element.assetTotalPriceInUSD) - web3.utils.fromWei(amountToInvest.toString()) <= 0) {
                    retobj.assetAddress = element.assetAddress;
                    retobj.assetTotalBalance = element.assetTotalBalance;
                    amountToInvest = web3.utils.toWei((web3.utils.fromWei(amountToInvest.toString()) - web3.utils.fromWei(element.assetTotalPriceInUSD.toString())).toString());
                }
                else {
                    let retAssetBalance = (web3.utils.fromWei(amountToInvest.toString()) / web3.utils.fromWei(element.assetPriceInUSD)).toString();
                    retobj.assetAddress = element.assetAddress;
                    retobj.assetTotalBalance = (retAssetBalance * (10 ** element.assetDecimals)).toLocaleString('fullwide', { useGrouping: false }).split('.')[0];
                    amountToInvest = 0;
                }
                crvAssetsMapping.set(web3.utils.toChecksumAddress(retobj.assetAddress), retobj.assetTotalBalance)
            }
            return retobj;
        })).filter(element => Object.keys(element).length !== 0);

        if (amountToInvest === 0 || amountToInvest === '0') {
            nonCrvBaseAssetArr = [];
        }
        else {
            (nonCrvBaseAssetArr.filter(element => crvPoolAssets.indexOf(web3.utils.toChecksumAddress(element.assetAddress)) === -1).map((element) => {
                let retobj = {};
                if (web3.utils.fromWei(amountToInvest.toString()) > 0) {
                    if (web3.utils.fromWei(element.assetTotalPriceInUSD) - web3.utils.fromWei(amountToInvest.toString()) <= 0) {
                        retobj.assetAddress = element.assetAddress;
                        retobj.assetTotalBalance = element.assetTotalBalance;
                        amountToInvest = web3.utils.toWei((web3.utils.fromWei(amountToInvest.toString()) - web3.utils.fromWei(element.assetTotalPriceInUSD.toString())).toString());
                    }
                    else {
                        let retAssetBalance = (web3.utils.fromWei(amountToInvest.toString()) / web3.utils.fromWei(element.assetPriceInUSD)).toString();
                        retobj.assetAddress = element.assetAddress;
                        retobj.assetTotalBalance = (retAssetBalance * (10 ** element.assetDecimals)).toLocaleString('fullwide', { useGrouping: false }).split('.')[0];
                        amountToInvest = 0;
                    }
                    nonCrvBaseAssetsMapping.set(web3.utils.toChecksumAddress(retobj.assetAddress), retobj.assetTotalBalance)
                }
                return retobj;

            })).filter(element => Object.keys(element).length !== 0);
        }
        return { crvPoolAssetsObj, nonCrvBaseAssetArr, crvAssetsMapping, nonCrvBaseAssetsMapping }
    } catch (error) {
        console.log(error)
        return error;
    }
}

const getAmountToInvest = (vaultNAV, vaultNAVWithoutStrategy, ocbPercentage) => {
    let optimalSafeBalance = (web3.utils.fromWei(vaultNAV) * (ocbPercentage));
    if (web3.utils.fromWei(vaultNAVWithoutStrategy) > optimalSafeBalance)
        return web3.utils.toWei(((web3.utils.fromWei(vaultNAVWithoutStrategy) - optimalSafeBalance).toString()).toLocaleString('fullwide', { useGrouping: false }))
    else
        return 0
}

exports.sentInstruction = async function (relayer, minterAddress, instruction) {
    const txRes = { hash: 'hash' }
    // const txRes = await relayer.sendTransaction({
    //     to: minterAddress,
    //     data: instruction,
    //     speed: 'fast',
    //     gasLimit: '1000000',
    // });
    return `Transaction hash: ${txRes.hash}`;
}


exports.estimateGas = async (from, to, data) => {
    let txnObject = {
        from,
        to,
        data
    };
    let estGas = await web3.eth.estimateGas(txnObject);
    console.log("estGs:", estGas)
    return estGas;
}

exports.getGasUsedInUSD = async (gasUsed) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let oneEtherInWEI = await priceModule.methods.getLatestPrice('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419').call();
        let oneEtherInUSD = oneEtherInWEI[0] / (10 ** 8)
        let currentGasPriceInWEI = await web3.eth.getGasPrice(); // UNCOMMENT IN PRODUCTION
        // let currentGasPriceInWEI = web3.utils.toWei(((await axios.get(`https://api.etherscan.io/api/?module=gastracker&action=gasoracle&apikey=${etherscanAPIKey}`)).data.result.FastGasPrice).toString(), 'gwei');
        let gasUsedInUSD = (currentGasPriceInWEI * gasUsed * oneEtherInUSD) / (10 ** 18)
        return gasUsedInUSD;
    } catch (error) {
        throw error;
    }
}

exports.getMaxAPYProtocol = async (vaultAddress, strategyAddress) => {
    try {
        const maxAPYProtocol = await axios.get(`${BASE_URL}/defender/max-apy?vaultAddress=${vaultAddress}&strategyAddress=0x2747ce11793f7059567758cc35d34f63cee8ac00`)
        if ((maxAPYProtocol.data.status) && (maxAPYProtocol.data.data)) {
            console.log("Max APY Protocol", maxAPYProtocol.data.data)
            return (maxAPYProtocol.data.data)
        } else {
            return 0
        }
    } catch (error) {
        console.log(`Error oocured in getting Max APY Protocol: ${error}`)
        return 0
    }
}

const setActiveProtocol = async (relayer, vaultAddress, protocolAddress) => {
    try {
        let instruction = web3.eth.abi.encodeFunctionCall({
            name: 'setActiveProtocol',
            type: 'function',
            inputs: [{
                type: 'address',
                name: '_protocol'
            }]
        }, [protocolAddress]);
        instruction = instruction.substring(2)

        let minterInstruction = web3.eth.abi.encodeFunctionCall({
            name: 'mintStrategy',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'safeAddress'
            }, {
                type: 'string',
                name: 'instruction'
            }]
        }, [vaultAddress, instruction]);

        console.log(`Sending protocol set instruction:- setActiveProtocol(address) with hash ${minterInstruction}, to safe :- ${vaultAddress}`);
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, minterInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)
        // return 'success'
        let params = {
            type: 'set protocol',
            gasUsed,
            gasCost,
            vaultAddress,
            instruction,
            protocolAddress,
            livaOneMinter
        }
        console.log(params);
        // let activeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
        // console.log("activeProtocolHash", activeProtocolHash)
        return { response: "activeProtocolHash", status: true }
    } catch (error) {
        return `Error occured in setting activeProtocl,${error.message}`
    }
}

const changeProtocol = async (relayer, vaultAddress, threshold, protocolAddress, newProtocolAPY, activeProtocolAPY, vaultNAVInStrategy, ocb) => {
    try {
        let instruction = web3.eth.abi.encodeFunctionCall({
            name: "changeProtocol",
            type: "function",
            inputs: [{
                type: "address",
                name: "_protocol"
            }]
        }, [protocolAddress]);
        instruction = instruction.substring(2)

        let minterInstruction = web3.eth.abi.encodeFunctionCall({
            name: 'mintStrategy',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'safeAddress'
            }, {
                type: 'string',
                name: 'instruction'
            }]
        }, [vaultAddress, instruction]);

        console.log(`Sending protocol change instruction:- changeProtocol(address) with hash ${minterInstruction}, to safe :- ${vaultAddress}`);
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, minterInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)
        let params = {
            type: 'change protocol',
            gasUsed,
            gasCost,
            vaultAddress,
            instruction,
            protocolAddress,
            vaultNAVInStrategy: web3.utils.fromWei(vaultNAVInStrategy.toString()),
            newProtocolAPY,
            activeProtocolAPY,
            ocb: web3.utils.fromWei(ocb.toString()),
            livaOneMinter
        }
        console.log(params);

        if (gasCost < web3.utils.fromWei(ocb.toString()) && (web3.utils.fromWei(vaultNAVInStrategy.toString()) * (newProtocolAPY - activeProtocolAPY)) / 100 - gasCost > 0) {
            console.log("Change protocol condition satisfied")
            let changeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
            return { response: changeProtocolHash, status: true }
        }
        else {
            console.log("Change protocol condition not satisfied")
            return { response: 'Gas costs high', status: false }
        }

    } catch (error) {
        console.log(`Error occured in change-protocol,${error.message}`)
        return { response: error.message, status: false }
    }
}

const earn = async (relayer, vault, vaultActiveProtocol, amountToInvest) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let protocolContract = new web3.eth.Contract(IVaultABI, vaultActiveProtocol);
        let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
        let curve3Pool = new web3.eth.Contract(CRV3Pool, crv3poolAddress);

        let returnToken = await protocolContract.methods.token().call();
        let returnTokenPrice = await priceModule.methods.getUSDPrice(returnToken).call();

        let vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]

        let _assetArr = (await Promise.all(
            vaultAssets.map(async (assetAddress, index) => {
                let assetBalance = await safeContract.methods.getTokenBalance(assetAddress).call();
                let assetPriceInUSD = await priceModule.methods.getUSDPrice(assetAddress).call();
                let token = new web3.eth.Contract(ERC20, assetAddress);
                let assetDecimals = await token.methods.decimals().call();
                return {
                    assetAddress,
                    assetPriceInUSD,
                    assetTotalBalance: assetBalance,
                    assetDecimals,
                    assetTotalPriceInUSD: getPriceInUsd(assetBalance, assetDecimals, assetPriceInUSD),
                };
            })
        )).filter(element => element.assetTotalBalance !== '0');

        _assetArr.sort((a, b) => {
            return getPriceInUsd(b.assetTotalBalance, b.assetDecimals, b.assetPriceInUSD) - getPriceInUsd(a.assetTotalBalance, a.assetDecimals, a.assetPriceInUSD);
        })

        let _nonCrvAssetArr = _assetArr.filter(value => {
            return [DAI, USDC, USDT].indexOf(web3.utils.toChecksumAddress(value.assetAddress)) == -1
        })

        let { crvPoolAssetsObj, nonCrvBaseAssetArr, crvAssetsMapping, nonCrvBaseAssetsMapping } = await assetProportions({ assetArr: _assetArr, nonCrvBaseAssetArr: _nonCrvAssetArr, amountToInvest })
        const nonCrvAssetsInVault = _nonCrvAssetArr.filter(element => nonCrvBaseAssetsMapping.has(element.assetAddress)).map(element => element.assetAddress)
        const nonCrvAssetBalancesInVault = nonCrvAssetsInVault.map(element => nonCrvBaseAssetsMapping.get(element))
        let assetsToBeUsed = [];
        let amountsOfAssetsToBeUsed = [];
        if (crvAssetsMapping.has(DAI)) {
            assetsToBeUsed.push(DAI);
            amountsOfAssetsToBeUsed.push(crvAssetsMapping.get(DAI));
        }
        if (crvAssetsMapping.has(USDC)) {
            assetsToBeUsed.push(USDC);
            amountsOfAssetsToBeUsed.push(crvAssetsMapping.get(USDC));
        }
        if (crvAssetsMapping.has(USDT)) {
            assetsToBeUsed.push(USDT);
            amountsOfAssetsToBeUsed.push(crvAssetsMapping.get(USDT));
        }

        assetsToBeUsed.push(...nonCrvAssetsInVault);
        amountsOfAssetsToBeUsed.push(...nonCrvAssetBalancesInVault)

        let expectedReturnsInYVTokens = web3.utils.toWei(((web3.utils.fromWei(amountToInvest) * (1 - slippage) / web3.utils.fromWei(returnTokenPrice))).toLocaleString('fullwide', { useGrouping: false }).split('.')[0]);
        let estimatedReturns = await curve3Pool.methods.calc_token_amount([crvAssetsMapping.get(DAI) === undefined ? 0 : crvAssetsMapping.get(DAI), crvAssetsMapping.get(USDC) === undefined ? 0 : crvAssetsMapping.get(USDC), crvAssetsMapping.get(USDT) === undefined ? 0 : crvAssetsMapping.get(USDT)], true).call();
        estimatedReturns = estimatedReturns * (1 - slippage);

        let dataParams = web3.eth.abi.encodeParameters(
            ['address[3]', 'uint256[3]', 'uint256', 'address[]', 'uint256[]'],
            [
                [DAI, USDC, USDT],
                [crvAssetsMapping.get(DAI) === undefined ? '0' : crvAssetsMapping.get(DAI), crvAssetsMapping.get(USDC) === undefined ? '0' : crvAssetsMapping.get(USDC), crvAssetsMapping.get(USDT) === undefined ? '0' : crvAssetsMapping.get(USDT)],
                estimatedReturns.toLocaleString('fullwide', { useGrouping: false }),
                nonCrvAssetsInVault,
                nonCrvAssetBalancesInVault
            ]
        )
        console.log('dataParams', dataParams)
        let earnInstruction = web3.eth.abi.encodeFunctionCall({
            name: "earn",
            type: "function",
            inputs: [{
                type: "address",
                name: "safeAddress"
            }, {
                type: "address[]",
                name: "_assets"
            },
            {
                type: "uint256[]",
                name: "_amount",
            },
            {
                type: "bytes",
                name: "data"
            }
            ]
        }, [vault.vaultAddress, assetsToBeUsed, amountsOfAssetsToBeUsed, dataParams]);

        console.log("EarnInstruction: ", earnInstruction)
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, earnInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)

        let params = {
            type: 'earn protocol',
            livaOneMinter,
            gasUsed,
            gasCost,
            vaultAddress: vault.vaultAddress,
            vaultActiveProtocol,
            returnTokenPrice,
            expectedReturnsInYVTokens,
            amountToInvest,
            assetsToBeUsed,
            amountsOfAssetsToBeUsed,
            crvAssets: [DAI, USDC, USDT],
            crvAssetsbalance: [crvAssetsMapping.get(DAI) === undefined ? 0 : crvAssetsMapping.get(DAI), crvAssetsMapping.get(USDC) === undefined ? 0 : crvAssetsMapping.get(USDC), crvAssetsMapping.get(USDT) === undefined ? 0 : crvAssetsMapping.get(USDT)],
            estimatedReturns: (estimatedReturns).toLocaleString('fullwide', { useGrouping: false }).split('.')[0],
        }
        console.log(params);

        if (amountToInvest - minimumThresholdForDeposit - gasCost > 0 && expectedReturnsInYVTokens > 0) {
            console.log("Earn condition satisfied")
            let earnInstructionHash = await exports.sentInstruction(relayer, livaOneMinter, earnInstruction, gasUsed + 10000)
            console.log("earnInstructionHash:", earnInstructionHash)
            return { response: "earnInstructionHash", status: true };
        }
        else {
            return { response: "Skipping deposit due to bad prices", status: false };
        }
    } catch (error) {
        console.log(error)
        return `Error occured in change-protocol,${error.message}`
    }
}

exports.handler = async function (credentials) {

    let relayer = relayerAddress
    let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
    const vaults = await axios.get(`${BASE_URL}/vault`);

    if ((vaults.data.status) && ((vaults.data.data).length > 0)) {

        await Promise.all((vaults.data.data).map(async (vault) => {
            try {
                let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
                let vaultActiveStrategy = await safeContract.methods.getVaultActiveStrategy().call();
                vaultActiveStrategy = vaultActiveStrategy[0];

                let vaultNAV = await safeContract.methods.getVaultNAV().call();
                let vaultNAVWithoutStrategy = await safeContract.methods.getVaultNAVWithoutStrategyToken().call();
                let vaultNAVInStrategy = (web3.utils.toBN(vaultNAV).sub(web3.utils.toBN(vaultNAVWithoutStrategy))).toString();
                let amountToInvest = getAmountToInvest(vaultNAV, vaultNAVWithoutStrategy, 0.1)

                if (vaultActiveStrategy.toLowerCase() === livaOne) {
                    let strategyInstance = new web3.eth.Contract(strategyABI, vaultActiveStrategy);
                    let vaultActiveProtocol = await strategyInstance.methods.getActiveProtocol(vault.vaultAddress).call();

                    if (vaultActiveProtocol) {
                        let maxProtocolData = await exports.getMaxAPYProtocol(vault.vaultAddress, vaultActiveStrategy);
                        /****
                        To activate a protocol if no active protocol is present 
                        ***/
                        if (vaultActiveProtocol == "0x0000000000000000000000000000000000000000") {
                            if (maxProtocolData.protocolAddress != 0) {
                                let activeProtocolHash = await setActiveProtocol(relayer, vault.vaultAddress, maxProtocolData.protocolAddress)
                                /**
                                 * UNCOMMENT TO SAVE TO DB
                                 * 
                                 */
                                // let saveActiveProtocol = await axios.patch(`${BASE_URL}/defender/set-protocol`, {
                                //     vaultAddress: vault.vaultAddress,
                                //     strategyAddress: vaultActiveStrategy,
                                //     protocolAddress: maxProtocolData.protocolAddress
                                // })
                                // if (saveActiveProtocol.data.status) {
                                //     console.log('Active Protocol added to DB')
                                // } else {
                                //     console.log('Error in saving active protocol to db')
                                // }
                                return activeProtocolHash.response
                            } else {
                                return 'Error occured in getting maxAPYProtocol'
                            }
                        }

                        /*** 
                        To check if there is a need to change protocol or to deposit to strategy
                        ***/
                        else {
                            // to get current active protcol and its activated date
                            const strategyProtocolData = await axios.get(`${BASE_URL}/vault/strategymap?vaultAddress=${vault.vaultAddress}&strategyAddress=0x2747ce11793f7059567758cc35d34f63cee8ac00`)
                            const protocolAPYData = await axios.get(`${BASE_URL}/defender/protocol-apy?protocolAddress=${vaultActiveProtocol}`)
                            if (strategyProtocolData.data.status) {
                                let currentDate = Date.parse(new Date());
                                let numberOfDaysToAdd = (strategyProtocolData.data.data.invesmentDuration) * 24 * 60 * 60 * 1000;
                                let lastActivatedDate = Date.parse(strategyProtocolData.data.data.activeProtocolDetails.activatedDate);

                                let activeProtocolAPY = protocolAPYData.data.data.oneWeekAPY;

                                if ((protocolAPYData.data.status) && (protocolAPYData.data.data) && (maxProtocolData)) {

                                    let newProtocolAPY = maxProtocolData.oneWeekAPY;
                                    let newProtocolAddress = maxProtocolData.protocolAddress;

                                    if ((currentDate - lastActivatedDate) > numberOfDaysToAdd && newProtocolAddress != vaultActiveProtocol && newProtocolAPY > activeProtocolAPY) {
                                        let changeProtocolHash = await changeProtocol(relayer, vault.vaultAddress, threshold, newProtocolAddress, newProtocolAPY, activeProtocolAPY, vaultNAVInStrategy, amountToInvest)
                                        if (changeProtocolHash.status) {
                                            /**
                                             * UNCOMMENT TO SAVE TO DB
                                             */
                                            // let saveActiveProtocol = await axios.patch(`${BASE_URL}/defender/set-protocol`, {
                                            //     vaultAddress: vault.vaultAddress,
                                            //     strategyAddress: vaultActiveStrategy,
                                            //     protocolAddress: maxProtocolData.protocolAddress
                                            // })
                                            // if (saveActiveProtocol.data.status) {
                                            //     console.log('Active Protocol added to DB')
                                            // } else {
                                            //     console.log('Error in saving active protocol to db')
                                            // }
                                            return changeProtocolHash.response
                                        }
                                        else
                                            console.log(changeProtocolHash.response)
                                    }
                                    /*** Calling EARN*/
                                    let earnHash = await earn(relayer, vault, vaultActiveProtocol,amountToInvest);
                                    return earnHash.response
                                }
                            }
                        }
                    }

                } else {
                    return 'Liva one strategy not present.' // To check if return needed
                }
            } catch (error) {
                console.log(error)
            }
        }))
    } else {
        return 'No vault present.'
    }
}
if (require.main === module) {
    require('dotenv').config();
    const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}