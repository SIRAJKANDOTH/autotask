const {
    Relayer
} = require('defender-relay-client');
const axios = require('axios')
const BN = require('bn.js');
const Web3 = require('web3');
// const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
const provider = new Web3.providers.WebsocketProvider("ws://localhost:8545");

let web3 = new Web3(provider);

const BASE_URL = "http://localhost:8050";

const yieldsterABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20Detailed.json').abi;
const CRV3Pool = require("yieldster-abi/contracts/curve3pool.json").abi;

const singleAssetStrategyAddress = "0xf07344bdaA9a9ee0Fa4E22a6393403f50d2f7E1F";
const singleAssetStrategyMinter = "0xE93C4f07DECD2c7Ec87572373AB14a1e41923b50";

const zeroAddress = "0x0000000000000000000000000000000000000000";
const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const relayerAddress = "0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0";

const crv3poolAddress = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const slippage = 0.01;
const minimumDeposit = "10"
const minimumThresholdForDeposit = 0;

const getPriceInUsd = (assetBalance, assetDecimals, assetPriceInUSD) => {
    return web3.utils.toWei(((assetBalance / (10 ** assetDecimals)) * web3.utils.fromWei(assetPriceInUSD.toString())).toString())
}

const sentInstruction = async function (relayer, minterAddress, instruction) {
    const txRes = {
        hash: 'hash'
    }
    // const txRes = await relayer.sendTransaction({
    //     to: minterAddress,
    //     data: instruction,
    //     speed: 'fast',
    //     gasLimit: '1000000',
    // });
    return `Transaction hash: ${txRes.hash}`;
}

const checkOCB = (vaultNAV, vaultNAVWithoutStrategy, optimalCashBalance) => {
    //OCB is in percentage
    console.log("ocb: ", optimalCashBalance)
    let optimalSafeBalance = new BN(vaultNAV).mul(new BN(optimalCashBalance)).div(new BN('100'));
    let toDeposit = new BN(vaultNAVWithoutStrategy).sub((optimalSafeBalance));
    console.log("optimalSafeBalance: ", optimalSafeBalance.toString())
    console.log("toDeposit: ", toDeposit.toString())
    if (toDeposit.isNeg())
        return false;
    else return true;
}

const estimateGas = async (from, to, data) => {
    let txnObject = {
        from,
        to,
        data
    };
    let estGas = await web3.eth.estimateGas(txnObject);
    console.log("estGs:", estGas)
    return estGas;
}

const getGasUsedInUSD = async (gasUsed) => {
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

const getAmountToInvest = (_vaultNAV, _vaultNAVWithoutStrategy, _ocbPercentage) => {
    let optimalSafeBalance = new BN(_vaultNAV).mul(new BN(_ocbPercentage)).div(new BN('100'));
    let toDeposit = new BN(_vaultNAVWithoutStrategy).sub(optimalSafeBalance);
    if (toDeposit.isNeg() || toDeposit.lt(new BN(minimumDeposit)))
        return '0';
    else
        return new BN(_vaultNAVWithoutStrategy).sub(optimalSafeBalance).toString();

}

const getMaxAPYProtocol = async (vaultAddress, strategyAddress) => {
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

const getAverageGasPrice = async () => {
    let gasPrice = await axios.get(`${BASE_URL}/defender/gas-price`);
    if (gasPrice.data.status) {
        return gasPrice.data.data.GasPrice;
    } else return 0;
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

const earn = async (relayer, vault, vaultActiveProtocol, amountToInvest) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let protocolContract = new web3.eth.Contract(IVaultABI, vaultActiveProtocol);
        let safeContract = new web3.eth.Contract(yieldsterABI, vault.vaultAddress);
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

        let {
            crvPoolAssetsObj,
            nonCrvBaseAssetArr,
            crvAssetsMapping,
            nonCrvBaseAssetsMapping
        } = await assetProportions({
            assetArr: _assetArr,
            nonCrvBaseAssetArr: _nonCrvAssetArr,
            amountToInvest
        })
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

        let expectedReturnsInYVTokens = web3.utils.toWei(((web3.utils.fromWei(amountToInvest) * (1 - slippage) / web3.utils.fromWei(returnTokenPrice))).toLocaleString('fullwide', {
            useGrouping: false
        }).split('.')[0]);
        let estimatedReturns = await curve3Pool.methods.calc_token_amount([crvAssetsMapping.get(DAI) === undefined ? 0 : crvAssetsMapping.get(DAI), crvAssetsMapping.get(USDC) === undefined ? 0 : crvAssetsMapping.get(USDC), crvAssetsMapping.get(USDT) === undefined ? 0 : crvAssetsMapping.get(USDT)], true).call();
        estimatedReturns = estimatedReturns * (1 - slippage);

        let dataParams = web3.eth.abi.encodeParameters(
            ['address[3]', 'uint256[3]', 'uint256', 'address[]', 'uint256[]'],
            [
                [DAI, USDC, USDT],
                [crvAssetsMapping.get(DAI) === undefined ? '0' : crvAssetsMapping.get(DAI), crvAssetsMapping.get(USDC) === undefined ? '0' : crvAssetsMapping.get(USDC), crvAssetsMapping.get(USDT) === undefined ? '0' : crvAssetsMapping.get(USDT)],
                estimatedReturns.toLocaleString('fullwide', {
                    useGrouping: false
                }),
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
        let gasUsed = await estimateGas(relayerAddress, singleAssetStrategyMinter, earnInstruction);
        let gasCost = await getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)

        let params = {
            type: 'earn protocol',
            singleAssetStrategyMinter,
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
            estimatedReturns: (estimatedReturns).toLocaleString('fullwide', {
                useGrouping: false
            }).split('.')[0],
        }
        console.log(params);

        if (amountToInvest - minimumThresholdForDeposit - gasCost > 0 && expectedReturnsInYVTokens > 0) {
            console.log("Earn condition satisfied")
            let earnInstructionHash = await sentInstruction(relayer, singleAssetStrategyMinter, earnInstruction, gasUsed + 10000)
            console.log("earnInstructionHash:", earnInstructionHash)
            return {
                response: "earnInstructionHash",
                status: true
            };
        } else {
            return {
                response: "Skipping deposit due to bad prices",
                status: false
            };
        }
    } catch (error) {
        console.log(error)
        return `Error occured in change-protocol,${error.message}`
    }
}

const handler = async () => {
    let relayer = zeroAddress;

    const vaults = await axios.get(`${BASE_URL}/vault`);
    if ((vaults.data.status) && (vaults.data.data)) {
        await Promise.all((vaults.data.data).map(async (vault) => {
            try {
                let yieldsterContractInstance = new web3.eth.Contract(yieldsterABI, vault.vaultAddress);
                let vaultNAV = await yieldsterContractInstance.methods.getVaultNAV().call();
                let vaultNAVWithoutStrategy = await yieldsterContractInstance.methods.getVaultNAVWithoutStrategyToken().call();
                console.log("vaultNAV: ", vaultNAV);
                console.log("vaultNAVWithoutStrategy: ", vaultNAVWithoutStrategy);
                /**
                 To check if optimal cash balance is present in the vault for strategy deposit
                 */
                if (checkOCB(vaultNAV, vaultNAVWithoutStrategy, vault.optimalCashBalance)) {
                    let vaultActiveStrategy = await yieldsterContractInstance.methods.getVaultActiveStrategy().call();
                    vaultActiveStrategy = vaultActiveStrategy[0];
                    console.log("strategy:", vaultActiveStrategy);
                    let maxAPYProtocolData = await getMaxAPYProtocol(vault.vaultAddress, vaultActiveStrategy);
                    let newProtocolAddress = maxAPYProtocolData.protocolAddress;
                    let amountToInvest = getAmountToInvest(vaultNAV, vaultNAVWithoutStrategy, vault.optimalCashBalance);
                    console.log("amountToInvest:", amountToInvest)

                    if (vaultActiveStrategy.toLowerCase() === singleAssetStrategyAddress.toLowerCase()) {
                        /*** Calling EARN*/
                        let earnHash = await earn(relayer, vault, newProtocolAddress, amountToInvest);
                        return earnHash.response
                    } else {
                        console.log("no startegy")
                        return "No active strategy present."
                    }

                } else console.log("Optimal Cash Balance not present in the vault");
            } catch (error) {
                console.log(error.message)
                return error.message;
            }
        }))
    } else console.log("No vaults present.")
}

handler();