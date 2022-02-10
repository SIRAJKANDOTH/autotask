const { Relayer } = require('defender-relay-client');
const axios = require('axios');
const Web3 = require('web3');

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE TO BE ADDED POST DEPLOYMENT */
const PRIVATE_KEY = "";
// const PROVIDER = "ws://localhost:8545";
const PROVIDER = "wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08";
const TXN_SIGNER = "0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0";
//**************************************************************************************** */

const web3 = new Web3(new Web3.providers.WebsocketProvider(PROVIDER));
const BN = web3.utils.BN;

const yieldsterABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20Detailed.json').abi;
const CRV3Pool = require("yieldster-abi/contracts/curve3pool.json").abi;
const minter = require("yieldster-abi/contracts/LivaOneMinter.json").abi;
const safeConfig = require("./safeConfigs.json");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";

const etherscanAPIKey = "EPZKUNTQJSRTD1RTVHVIF6AWJF4FP3FJZY";

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE UNIQUE TO EACH SINGLE ASSET CRV STRATEGY */
const singleAssetStrategyMinter = "0x27f11E87a7492eA8d988EaA107311B38ff3DEE06";
const singleAssetStrategyAddress = "0xb2F98AE1b70633CAa4Af8A7a9B2A489358F7c0F7";
const curveVaultAddress = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const yVAcceptToken = "";
//**************************************************************************************** */

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS MUST BE UNIQUE FOR EACH VAULT. Vaulues here are defaults */
const ocbPercentage = '10'; //0.1%
let maximumOptimalSafeBalance = '10000000000000000000000'; //10k Dollars
let minimumDeposit = '500000000000000000000'; //0.5k Dollars
//**************************************************************************************** */


//-------curve-vault--ERC-20-TOKENS-------------------------//
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
//-------curve-vault--ERC-20-TOKENS-------------------------//


const priceModule = new web3.eth.Contract(priceModuleABI, "0xc98435837175795d216547a8edc9e0472604bbda");

const BASE_URL = "https://api.yieldster.finance";


const getGasUsedInUSD = async (gasUsed) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let oneEtherInWEI = await priceModule.methods.getLatestPrice('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419').call();
        let oneEtherInUSD = new BN(oneEtherInWEI[0]).div(
            (new BN('10')).pow(new BN('8'))
        );
        let currentGasPriceInWEI = (new BN(await web3.eth.getGasPrice())).add(new BN('10000000000')); // Adding 10 GWEI
        // let currentGasPriceInWEI = (new BN(web3.utils.toWei(((await axios.get(`https://api.etherscan.io/api/?module=gastracker&action=gasoracle&apikey=${etherscanAPIKey}`)).data.result.FastGasPrice).toString(), 'gwei')));
        console.log("gasCosts", gasUsed)
        console.log("currentGasPriceInWEI", currentGasPriceInWEI.toString())
        let gasUsedInUSD = currentGasPriceInWEI
            .mul(new BN(gasUsed))
            .mul(oneEtherInUSD);
        return gasUsedInUSD;
    } catch (error) {
        throw error;
    }
}

// const getOCB = (vaultAddress) => {
//     let obj = 
// }

const sendTransaction = async (data, secrets,gasCosts) => {
    try {
        let privateKey = ""
        if (secrets.hasOwnProperty('MAINNET_ACTUAL'))
            privateKey = secrets.MAINNET_ACTUAL;
        else
            privateKey = PRIVATE_KEY;
        let acc = web3.eth.accounts.privateKeyToAccount(privateKey);
        let wallet = web3.eth.accounts.wallet.add(acc);

        const txn = await web3.eth.sendTransaction({
            to: singleAssetStrategyMinter,
            from: 0,
            data: data,
            gas:((new BN(gasCosts)).add(new BN('50000'))).toString()
        })
        return { status: true, message: "txn.hash" }
    } catch (error) {
        console.log(error)
        return { status: false, message: error }
    }
}

const getAssetTotalPriceInUSD = (assetBalance, assetDecimals, assetPriceInUSD) => {
    let val = (new BN(assetBalance).div(new BN('10').pow(new BN(assetDecimals)))).mul(new BN(assetPriceInUSD));
    return (val)
}

const getAmountToInvest = (_vaultNAV, _vaultNAVWithoutStrategy, _ocbPercentage, minDeposit, maxOptimalSafeBalance) => {
    let optimalSafeBalance = new BN(_vaultNAV).mul(new BN(_ocbPercentage)).div(new BN('10000'));
    console.log("optimalSafeBalance:- ", optimalSafeBalance.toString() / (10 ** 18))
    if (optimalSafeBalance.gt(new BN(maxOptimalSafeBalance)))
        optimalSafeBalance = new BN(maxOptimalSafeBalance);
    let toDeposit = new BN(_vaultNAVWithoutStrategy).sub(optimalSafeBalance);
    if (toDeposit.isNeg() || toDeposit.lt(new BN(minDeposit)))
        return new BN('0');
    else
        return toDeposit
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

const earn = async (vault, amountToInvest, safeContract, secrets) => {
    try {
        // const strategyInstance = new web3.eth.Contract(strategyABI, singleAssetStrategyAddress);
        const curvePool = new web3.eth.Contract(CRV3Pool, curveVaultAddress);
        let minterContract = new web3.eth.Contract(minter, singleAssetStrategyMinter);
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

        let gasCosts = await minterContract.methods.earn(vault.vaultAddress, [...assetsMapping.keys()], [...assetsMapping.values()], dataParams).estimateGas({ from: TXN_SIGNER });

        let gasUsedInUSD = await getGasUsedInUSD(gasCosts);
        if ((amountToInvest.mul(new BN('5')).div(new BN('100'))).gt(gasUsedInUSD)) //Checking if 5% of amount to invest is > gas costs 
        {
            let txn = await sendTransaction(earnInstruction, secrets,gasCosts)
            return { status: txn.status, response: txn.message }
        }
        else {
            console.log("Gas costs high")
            return { status: false, response: "Gas costs high" }
        }

    }
    catch (error) {
        console.log(error)
        return { status: false, response: `Error occured in change-protocol,${error.message}` }
    }
}

const handleVault = async (vault, secrets) => {
    try {
        console.log(`Vault Address :- ${vault.vaultAddress}`)
        const yieldsterContractInstance = new web3.eth.Contract(yieldsterABI, vault.vaultAddress);
        let vaultActiveStrategy = await yieldsterContractInstance.methods.getVaultActiveStrategy().call();
        vaultActiveStrategy = vaultActiveStrategy[0];

        if (vaultActiveStrategy && vaultActiveStrategy.toLowerCase() === singleAssetStrategyAddress.toLowerCase()) {
            let vaultNAV = await yieldsterContractInstance.methods.getVaultNAV().call();
            let vaultNAVWithoutStrategy = await yieldsterContractInstance.methods.getVaultNAVWithoutStrategyToken().call();
            console.log("vaultNAV: ", vaultNAV);
            console.log("vaultNAVWithoutStrategy: ", vaultNAVWithoutStrategy);
            /**
             To check if optimal cash balance is present in the vault for strategy deposit
             */
            let minDeposit = safeConfig[vault.vaultAddress] ? safeConfig[vault.vaultAddress].minimumDeposit : minimumDeposit;
            let maxOptimalSafeBalance = safeConfig[vault.vaultAddress] ? safeConfig[vault.vaultAddress].maximumOptimalSafeBalance : maximumOptimalSafeBalance;
            let OCB = safeConfig[vault.vaultAddress] ? safeConfig[vault.vaultAddress].ocbPercentage : ocbPercentage;
            let amountToInvest = getAmountToInvest(vaultNAV, vaultNAVWithoutStrategy, OCB, minDeposit, maxOptimalSafeBalance);
            console.log("amountToInvest: ", amountToInvest.toString())

            if (!amountToInvest.eq(new BN('0'))) {
                let earnHash = await earn(vault, amountToInvest, yieldsterContractInstance, secrets);
            } else console.log("Optimal Cash Balance not present in the vault");
            return { status: true, message: "processing" }
        }
        else {
            return { status: false, message: "Strategy not present for the vault" }
        }

    } catch (error) {
        console.log(error.message)
        return { status: false, message: error.message }
    }
}

exports.handler = async (event) => {
    try {
        const secrets = event.secrets;
        if (event.request.hasOwnProperty('queryParameters')) {
            if (event.request.queryParameters.hasOwnProperty('vaultAddress')) {
                const vault = await axios.get(`${BASE_URL}/vault/${event.request.queryParameters.vaultAddress}`);
                if ((vault.data.status) && (vault.data.data)) {
                    let res = await handleVault(vault.data.data, secrets);
                    return res;
                }
                else
                    return { status: "false", message: "nil" };
            }
        }
        else {
            const vaults = await axios.get(`${BASE_URL}/vault`);
            if ((vaults.data.status) && (vaults.data.data)) {
                let response = await Promise.all((vaults.data.data).map(async (vault) => {
                    let res = await handleVault(vault, secrets);
                    return res;
                }))
                return response;
            }
            else
                return { status: "false", message: "nil" };
        }
        return { status: "false", message: "Invalid" }
    } catch (error) {
        console.log(error)
        return { status: "false", message: error.message }
    }
}

exports.handler({
    request: {
        queryParameters: { vaultAddress: "0x04D981889cdCA9344AF7d1D16206e62751430984" }
    },
    secrets: { MAINNET_ACTUAL: "" }
});
