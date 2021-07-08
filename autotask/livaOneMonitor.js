const {
    Relayer
} = require('defender-relay-client');
const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
let web3 = new Web3(provider);

const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/IPriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20.json').abi;
const ERC20Detailed = require("yieldster-abi/contracts/ERC20Detailed.json").abi;
const CRV3Pool = require("yieldster-abi/contracts/curve3pool.json").abi;

const livaOneMinter = "0x7573E53adeC374AEe7BD63f7d33e456EAcd10631";
const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const relayerAddress = "0xd1235f988cf494e97b92992ece0a4a2cbfec2ddf";

const BASE_URL = "http://localhost:8050"
const crv3poolAddress = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const livaOne = "";
const threshold = 0;
const minimumInvestmentDuration = 7;
const strategyPortfolio = 0.5;
const slippage = 0.01;
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

exports.sentInstruction = async function (relayer, minterAddress, instruction) {
    const txRes = await relayer.sendTransaction({
        to: minterAddress,
        data: instruction,
        speed: 'fast',
        gasLimit: '1000000',
    });
    return `Transaction hash: ${txRes.hash}`;
}

exports.getMaxAPYProtocol = async (vaultAddress, strategyAddress) => {
    try {
        const maxAPYProtocol = await axios.get(`${BASE_URL}/defender/max-apy?vaultAddress=${vaultAddress}&strategyAddress=${strategyAddress}`)
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
        let oneEtherInWEI = await priceModuleABI.methods.getLatestPrice('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419').call();
        let oneEtherInUSD = oneEtherInWEI[0] / (10 ** 8)
        let currentGasPriceInWEI = await web3.eth.getGasPrice();
        let gasUsedInUSD = (currentGasPriceInWEI * gasUsed * oneEtherInUSD) / (10 ** 18)
        return gasUsedInUSD;
    } catch (error) {
        throw error;
    }

}

exports.calculateBalance = (tokenAddress, safeAddress) => {
    try {
        let tokenContract = new web3.eth.Contract(ERC20Detailed, tokenAddress);
        let tokenBalance = await tokenContract.methods.balanceOf(safeAddress).call();
        let decimals = await tokenContract.methods.balanceOf(safeAddress).call();
        // return web3.utils.padRight(tokenBalance, 18 - decimals)
        return tokenBalance;
    } catch (error) {
        return `Error occured while calling calculateBalance, ${error.message}`
    }
}

exports.setActiveProtocol = async (relayer, vaultAddress, protocolAddress) => {
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
        minterInstruction = minterInstruction.substring(2)

        console.log(`Sending protocol set instruction:- setActiveProtocol(address) with hash ${minterInstruction}, to safe :- ${vaultAddress}`);
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, minterInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)
        // return 'success'
        let activeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
        console.log("activeProtocolHash", activeProtocolHash)
        return activeProtocolHash
    } catch (error) {
        return `Error occured in setting activeProtocl,${error.message}`
    }
}

exports.changeProtocol = async (relayer, vaultAddress, threshold, protocolAddress, newProtocolAPY, activeProtocolAPY, vaultNAVInStrategy) => {
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
        minterInstruction = minterInstruction.substring(2)

        console.log(`Sending protocol set instruction:- changeProtocol(address) with hash ${minterInstruction}, to safe :- ${vaultAddress}`);
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, minterInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)
        if (vaultNAVInStrategy * (newProtocolAPY - activeProtocolAPY) - gasCost > 0) {
            console.log("Change protocol condition satisfied")
            let changeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
            return { response: changeProtocolHash, status: true }
        }
        else
            return { response: 'Gas costs high', status: false }
    } catch (error) {
        return `Error occured in change-protocol,${error.message}`
    }
}

exports.earn = (relayer, vault, vaultActiveProtocol, vaultNAV) => {

    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let protocolContract = new web3.eth.Contract(IVaultABI, vaultActiveProtocol);
        let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
        let curve3Pool = new web3.eth.Contract(CRV3Pool, crv3poolAddress);

        let balanceOfDAI = await(await safeContract.methods.getTokenBalance(DAI).call()).toString();
        let balanceOfUSDC = await(await safeContract.methods.getTokenBalance(USDC).call()).toString();
        let balanceOfUSDT = await(await safeContract.methods.getTokenBalance(USDT).call()).toString();
        let returnToken = await protocolContract.methods.token().call();
        let returnTokenPrice = await priceModule.methods.getUSDPrice(returnToken).call();

        let ocb = vaultNAV * 0.1;
        let vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]


        let _assetArr = await Promise.all(
            vaultAssets.map(async (assetAddress) => {

                let assetBalance = await safeContract.methods.getTokenBalance(assetAddress).call();
                let assetPrice = await priceModule.methods.getUSDPrice(assetAddress).call();
                return {
                    assetAddress: assetAddress,
                    assetTotalPrice: assetBalance * assetPrice,
                    assetTotalBalance: assetBalance
                };
            })
        );


        let nonCrvBaseTokens = await Promise.all(
            _assetArr.map(async (val) => {
                if ([DAI, USDC, USDC].indexOf(val.assetAddress) == -1)
                    return {
                        assetAddress: val.assetAddress,
                        assetTotalBalance: val.assetBalance
                    }
            })
        )

        let nonCrvAssetList = nonCrvBaseTokens.map((val) => val.assetAddress);
        let nonCrvAssetTotalBalance = nonCrvBaseTokens.map((val) => val.assetTotalBalance);

        /* Sorting based on higher total price*/
        _assetArr.sort((a, b) => {
            return b.assetTotalPrice - a.assetTotalPrice;
        })


        let assetTotalPriceArr = _assetArr.map((val) => val.assetTotalPrice);
        let vaultAssetList = _assetArr.map((val) => val.assetAddress);
        let assetTotalBalance = _assetArr.map((val) => val.assetTotalBalance);

        let estimatedSlippageReturn = _assetArr.reduce(
            (accumulator, b) => {
                return accumulator + (b.assetTotalPrice * (1 - slippage))
            }, 0)

        let expectedReturnsInYVTokens = estimatedSlippageReturn / returnTokenPrice; //Note:- In WEI

        let toEarn = vaultNAV - ocb;
        console.log("vaultAssetList: ", vaultAssetList, "\nassetTotalPriceArr", assetTotalPriceArr, "\nassetTotalBalance", assetTotalBalance)

        let estimatedReturns = await curve3Pool.methods.calc_token_amount([balanceOfDAI, balanceOfUSDT, balanceOfUSDC], true).call();
        estimatedReturns = estimatedReturns * (1 - slippage);

        let dataParams = web3.eth.encodeParameters(
            ['address[3]', 'uint256[3]', 'uint256', 'address[]', 'uint256[]'],
            [
                [DAI, USDC, USDT],
                [balanceOfDAI, balanceOfUSDC, balanceOfUSDT],
                estimatedReturns.toString(),
                nonCrvAssetList,
                nonCrvAssetTotalBalance
            ]
        )

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
        }, [vault.vaultAddress, vaultAssetList, assetTotalBalance, dataParams]);
        earnInstruction = earnInstruction.substring(2)

        console.log("EarnInstruction: ", earnInstruction)
        let gasUsed = await exports.estimateGas(relayerAddress, livaOneMinter, earnInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)

        if (((toEarn / (returnTokenPrice)) >= expectedReturnsInYVTokens) && toEarn - gasCosts > gasCosts) {
            console.log("Earn condition satisfied")
            let earnInstructionHash = await exports.sentInstruction(relayer, livaOneMinter, earnInstruction)
            console.log("earnInstructionHash:", earnInstructionHash)
            return { response: earnInstructionHash, status: true };
        }
        else {
            return { response: "Skipping deposit due to bad prices", status: false };
        }
    } catch (error) {
        return `Error occured in change-protocol,${error.message}`
    }

}

exports.handler = async function (credentials) {

    const relayer = new Relayer(credentials);

    let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);

    const vaults = await axios.get(`${BASE_URL}/vault`)

    if ((vaults.data.status) && ((vaults.data.data).length > 0)) {

        await Promise.all((vaults.data.data).map(async (vault) => {
            try {
                let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
                let vaultActiveStrategy = await safeContract.methods.getVaultActiveStrategy().call();
                let vaultNAV = await safeContract.methods.getVaultNAV().call();
                let vaultNAVWithoutStrategy = await safeContract.methods.getVaultNAVWithoutStrategyToken().call();
                let vaultNAVInStrategy = vaultNAV - vaultNAVWithoutStrategy;
                vaultActiveStrategy = vaultActiveStrategy[0];

                if (vaultActiveStrategy === livaOne) {
                    let strategyInstance = new web3.eth.Contract(strategyABI, vaultActiveStrategy);
                    let vaultActiveProtocol = await strategyInstance.methods.getActiveProtocol(vault.vaultAddress).call();
                    /****
                    To activate a protocol if no active protocol is present 
                    ***/
                    if (vaultActiveProtocol) {
                        let maxProtocolData = await exports.getMaxAPYProtocol(vault.vaultAddress, vaultActiveStrategy);
                        if (vaultActiveProtocol == "0x0000000000000000000000000000000000000000") {
                            if (maxProtocolData.protocolAddress != 0) {
                                let activeProtocolHash = await exports.setActiveProtocol(relayer, vault.vaultAddress, maxProtocolData.protocolAddress)
                                let saveActiveProtocol = await axios.patch(`${BASE_URL}/defender/set-protocol`, {
                                    vaultAddress: vault.vaultAddress,
                                    strategyAddress: vaultActiveStrategy,
                                    protocolAddress: maxProtocolData.protocolAddress
                                })
                                if (saveActiveProtocol.data.status) {
                                    console.log('Active Protocol added to DB')
                                } else {
                                    console.log('Error in saving active protocol to db')
                                }
                                return activeProtocolHash
                            } else {
                                return 'Error occured in getting maxAPYProtocol'
                            }
                        }

                        /*** 
                        To check if there is a need to change protocol or to deposit to strategy
                        ***/
                        else {
                            // to get current active protcol and its activated date
                            const strategyProtcolData = await axios.get(`${BASE_URL}/vault/strategymap?vaultAddress=${vault.vaultAddress}&strategyAddress=${vaultActiveStrategy}`)
                            const protocolAPYData = await axios.get(`${BASE_URL}/defender/protocol-apy?protocolAddress=${vaultActiveProtocol}`)

                            if (strategyProtcolData.data.status) {
                                let currentDate = Date.parse(new Date());
                                let numberOfDaysToAdd = (strategyProtcolData.data.data.invesmentDuration) * 24 * 60 * 60 * 1000;
                                let lastActivatedDate = Date.parse(strategyProtcolData.data.data.activeProtocolDetails.activatedDate);

                                let activeProtocolAPY = protocolAPYData.data.data.oneWeekAPY;

                                if ((protocolAPYData.data.status) && (protocolAPYData.data.data) && (maxProtocolData)) {

                                    let newProtocolAPY = maxProtocolData.oneWeekAPY;
                                    let newProtocolAddress = maxProtocolData.protocolAddress;

                                    if ((currentDate - lastActivatedDate) > numberOfDaysToAdd && newProtocolAddress != vaultActiveProtocol && newProtocolAPY > activeProtocolAPY) {
                                        let changeProtocolHash = await exports.changeProtocol(relayer, vault.vaultAddress, threshold, newProtocolAddress, newProtocolAPY, activeProtocolAPY, vaultNAVInStrategy)
                                        if (changeProtocolHash.status) {
                                            let saveActiveProtocol = await axios.patch(`${BASE_URL}/defender/set-protocol`, {
                                                vaultAddress: vault.vaultAddress,
                                                strategyAddress: vaultActiveStrategy,
                                                protocolAddress: maxProtocolData.protocolAddress
                                            })
                                            if (saveActiveProtocol.data.status) {
                                                console.log('Active Protocol added to DB')
                                            } else {
                                                console.log('Error in saving active protocol to db')
                                            }
                                            return changeProtocolHash.response
                                        }
                                        else
                                            console.log(changeProtocolHash.response)
                                    }
                                    /*** Calling EARN*/
                                    let earnHash = await exports.earn(relayer, vault, vaultActiveProtocol, vaultNAV);
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
