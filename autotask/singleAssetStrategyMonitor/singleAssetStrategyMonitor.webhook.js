const { Relayer } = require('defender-relay-client');
const axios = require('axios');
const Web3 = require('web3');
// const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08"));
const BN = web3.utils.BN;


const yieldsterABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20Detailed.json').abi;
const CRV3Pool = require("yieldster-abi/contracts/curve3pool.json").abi;

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE UNIQUE TO EACH SINGLE ASSET CRV STRATEGY */
const singleAssetStrategyMinter = "0x27f11E87a7492eA8d988EaA107311B38ff3DEE06";
const singleAssetStrategyAddress = "0xb2F98AE1b70633CAa4Af8A7a9B2A489358F7c0F7";
const curveVaultAddress = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const yVAcceptToken = "";
const ocbPercentage = '10'; //
let minimumDeposit = '700000000000000000000'; //0.7k Dollars
let maximumOptimalSafeBalance = new BN('10000000000000000000000'); //10k Dollars
//**************************************************************************************** */
//-------curve-vault--ERC-20-TOKENS-------------------------//
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
//-------curve-vault--ERC-20-TOKENS-------------------------//


const priceModule = new web3.eth.Contract(priceModuleABI, "0xc98435837175795d216547a8edc9e0472604bbda");

const BASE_URL = "https://api.yieldster.finance";

const getPriceInUsd = (assetBalance, assetDecimals, assetPriceInUSD) => {
    return web3.utils.toWei(((assetBalance / (10 ** assetDecimals)) * web3.utils.fromWei(assetPriceInUSD.toString())).toString())
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

const getAverageGasPrice = async () => {
    let gasPrice = await axios.get(`${BASE_URL}/defender/gas-price`);
    if (gasPrice.data.status) {
        return gasPrice.data.data.GasPrice;
    } else return 0;
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


const getAssetTotalPriceInUSD = (assetBalance, assetDecimals, assetPriceInUSD) => {
    let val = (new BN(assetBalance).div(new BN('10').pow(new BN(assetDecimals)))).mul(new BN(assetPriceInUSD));
    return (val)
}

const getAmountToInvest = (_vaultNAV, _vaultNAVWithoutStrategy, _ocbPercentage) => {
    let optimalSafeBalance = new BN(_vaultNAV).mul(new BN(_ocbPercentage)).div(new BN('10000'));

    if (optimalSafeBalance.gt(maximumOptimalSafeBalance))
        optimalSafeBalance = maximumOptimalSafeBalance;
    let toDeposit = new BN(_vaultNAVWithoutStrategy).sub(optimalSafeBalance);
    if (toDeposit.isNeg() || toDeposit.lt(new BN(minimumDeposit)))
        return new BN('0');
    else
        return toDeposit
}

let gasPercent = '500';
totalEarnedAMount = '1000000000000000000000000';
let harvestCriteria=(new BN(totalEarnedAMount)).mul((new BN(gasPercent)).div(new BN('10000')))

let totalGas = '10000000000000'

if((new BN(totalGas)).lt(harvestCriteria)) {
    //Then call harvest
}

const isBaseAsset = (val) => {
    let crvPoolAssets = [DAI, USDC, USDT];
    if (crvPoolAssets.includes(web3.utils.toChecksumAddress(val)))
        return true
    else
        return false;
}


const assetProportions = (assetArr, amountToInvest) => {
    const assetsMapping = new Map();
    const baseAssetMapping = new Map();
    const nonBaseAssetMapping = new Map();
    assetArr.map((element) => {
        if (amountToInvest.gt(new BN('0'))) {
            if (amountToInvest.gt(element.assetTotalPriceInUSD)) {
                assetsMapping.set(element.assetAddress, element.assetTotalBalance);
                if (isBaseAsset(element.assetAddress))
                    baseAssetMapping.set(element.assetAddress, element.assetTotalBalance);
                else
                    nonBaseAssetMapping.set(element.assetAddress, element.assetTotalBalance);
                amountToInvest = amountToInvest.sub(element.assetTotalPriceInUSD);
            }
            else {
                let decimals = element.assetDecimals.toString();
                let assetsToUse = (amountToInvest.div(new BN(element.assetPriceInUSD))).mul((new BN('10')).pow(new BN(decimals)));
                assetsMapping.set(element.assetAddress, assetsToUse.toString());
                if (isBaseAsset(element.assetAddress))
                    baseAssetMapping.set(element.assetAddress, assetsToUse.toString());
                else
                    nonBaseAssetMapping.set(element.assetAddress, assetsToUse.toString());
                amountToInvest = new BN('0');
            }
        }
    })

    return { assetsMapping, baseAssetMapping, nonBaseAssetMapping }
}

const earn = async (vault, amountToInvest, safeContract) => {
    try {
        // const strategyInstance = new web3.eth.Contract(strategyABI, singleAssetStrategyAddress);
        const curvePool = new web3.eth.Contract(CRV3Pool, curveVaultAddress)
        let balanceOfDAI = await safeContract.methods.getTokenBalance(DAI).call();
        let balanceOfUSDC = await safeContract.methods.getTokenBalance(USDC).call();
        let balanceOfUSDT = await safeContract.methods.getTokenBalance(USDT).call();

        // const yVAcceptTokenPrice = await priceModule.methods.getUSDPrice(yVAcceptToken).call();
        const vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]

        let assetArr = (await Promise.all(
            vaultAssets.map(async (assetAddress) => {
                let assetBalance = await safeContract.methods.getTokenBalance(assetAddress).call();
                let assetPriceInUSD = await priceModule.methods.getUSDPrice(assetAddress).call();
                let token = new web3.eth.Contract(ERC20, assetAddress);
                let assetDecimals = await token.methods.decimals().call();
                return {
                    assetAddress: web3.utils.toChecksumAddress(assetAddress),
                    assetPriceInUSD,
                    assetTotalBalance: assetBalance,
                    assetDecimals,
                    assetTotalPriceInUSD: getAssetTotalPriceInUSD(assetBalance, assetDecimals, assetPriceInUSD),
                };
            })
        )).filter(element => element.assetTotalBalance !== '0')
            .sort((a, b) => b.assetTotalPriceInUSD.cmp(a.assetTotalPriceInUSD));

        let { assetsMapping, baseAssetMapping, nonBaseAssetMapping } = await assetProportions(assetArr, amountToInvest);

        // TODO:- Estimated returns should actually be calculated.
        let estimatedReturns = await curvePool.methods.calc_token_amount([balanceOfDAI, balanceOfUSDT, balanceOfUSDC], true).call();

        let dataParams = web3.eth.abi.encodeParameters(
            ['address[3]', 'uint256[3]', 'uint256', 'address[]', 'uint256[]'],
            [
                [DAI, USDC, USDT],
                [baseAssetMapping.get(DAI) === undefined ? '0' : baseAssetMapping.get(DAI), baseAssetMapping.get(USDC) === undefined ? '0' : baseAssetMapping.get(USDC), baseAssetMapping.get(USDT) === undefined ? '0' : (baseAssetMapping.get(USDT))],
                estimatedReturns === '0' ? '0' : '1',
                [...nonBaseAssetMapping.keys()],
                [...nonBaseAssetMapping.values()]
            ]
        );

        console.log([DAI, USDC, USDT],
            [baseAssetMapping.get(DAI) === undefined ? '0' : baseAssetMapping.get(DAI), baseAssetMapping.get(USDC) === undefined ? '0' : baseAssetMapping.get(USDC), baseAssetMapping.get(USDT) === undefined ? '0' : (baseAssetMapping.get(USDT))],
            estimatedReturns === '0' ? '0' : '1',
            [...nonBaseAssetMapping.keys()],
            [...nonBaseAssetMapping.values()])
        console.log(assetsMapping)
        console.log("dataparams:- ", dataParams);

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
        }, [vault.vaultAddress, [...assetsMapping.keys()], [...assetsMapping.values()], dataParams]);
        return { status: true, response: earnInstruction }
    }
    catch (error) {
        console.log(error)
        return { status: false, response: `Error occured in change-protocol,${error.message}` }
    }
}

const sendTransaction = async (relayer, data) => {
    try {
        let tx = relayer.sendTransaction({
            singleAssetStrategyMinter, data, speed: 'fast'
        });
        return tx;
    } catch (error) {
        console.log(error)
    }
}

const handleVault = async (vault) => {
    try {
        console.log(`Vault Address :- ${vault.vaultAddress}`)
        let relayer = zeroAddress;
        const yieldsterContractInstance = new web3.eth.Contract(yieldsterABI, vault.vaultAddress);
        let vaultActiveStrategy = await yieldsterContractInstance.methods.getVaultActiveStrategy().call();
        vaultActiveStrategy = vaultActiveStrategy[0];

        let vaultNAV = await yieldsterContractInstance.methods.getVaultNAV().call();
        let vaultNAVWithoutStrategy = await yieldsterContractInstance.methods.getVaultNAVWithoutStrategyToken().call();
        console.log("vaultNAV: ", vaultNAV);
        console.log("vaultNAVWithoutStrategy: ", vaultNAVWithoutStrategy);
        /**
         To check if optimal cash balance is present in the vault for strategy deposit
         */
        let amountToInvest = getAmountToInvest(vaultNAV, vaultNAVWithoutStrategy, ocbPercentage);
        console.log(amountToInvest.toString())
        console.log(vaultNAVWithoutStrategy.toString())

        if (!amountToInvest.eq(new BN('0'))) {
            let earnHash = await earn(vault, amountToInvest, yieldsterContractInstance);
        } else console.log("Optimal Cash Balance not present in the vault");
        return { status: true, message: "processing" }
    } catch (error) {
        console.log(error.message)
        return { status: false, message: error.message }
    }
}

const handler = async (event) => {
    try {
        if (event.request.hasOwnProperty('queryParameters')) {
            if (event.request.queryParameters.hasOwnProperty('vaultAddress')) {
                const vault = await axios.get(`${BASE_URL}/vault/${event.request.queryParameters.vaultAddress}`);
                if ((vault.data.status) && (vault.data.data)) {
                    let res = await handleVault(vault.data.data);
                    return res;
                }
                return { status: "false", message: "nil" };
            }
        }
        else {
            const vaults = await axios.get(`${BASE_URL}/vault`);
            if ((vaults.data.status) && (vaults.data.data)) {
                let response = await Promise.all((vaults.data.data).map(async (vault) => {
                    let res = await handleVault(vault);
                    return res;
                }))
                return response;
            }
        }
        process.exit(0) // Remove in PRODUCTION
        return { status: "false", message: "Invalid" }
    } catch (error) {
        console.log(error)
        process.exit(0) // Remove in PRODUCTION
        return { status: "false", message: error.message }
    }
}

handler({
    request: {
        queryParameters: { vaultAddress: "0x4B9aE1480c1b533256543D75367804159875724B" }
    }
});

// handler({request:""});