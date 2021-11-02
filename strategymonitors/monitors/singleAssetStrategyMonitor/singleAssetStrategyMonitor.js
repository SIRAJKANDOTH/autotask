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
const singleAssetStrategyMinter = "def"
const singleAssetStrategyAddress = "abc";
const curveVaultAddress = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B";
const yVAcceptToken = "abc";
const CRVASSETPOOL = [{ "name": "TokenExchange", "inputs": [{ "type": "address", "name": "buyer", "indexed": true }, { "type": "int128", "name": "sold_id", "indexed": false }, { "type": "uint256", "name": "tokens_sold", "indexed": false }, { "type": "int128", "name": "bought_id", "indexed": false }, { "type": "uint256", "name": "tokens_bought", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "TokenExchangeUnderlying", "inputs": [{ "type": "address", "name": "buyer", "indexed": true }, { "type": "int128", "name": "sold_id", "indexed": false }, { "type": "uint256", "name": "tokens_sold", "indexed": false }, { "type": "int128", "name": "bought_id", "indexed": false }, { "type": "uint256", "name": "tokens_bought", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "AddLiquidity", "inputs": [{ "type": "address", "name": "provider", "indexed": true }, { "type": "uint256[2]", "name": "token_amounts", "indexed": false }, { "type": "uint256[2]", "name": "fees", "indexed": false }, { "type": "uint256", "name": "invariant", "indexed": false }, { "type": "uint256", "name": "token_supply", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "RemoveLiquidity", "inputs": [{ "type": "address", "name": "provider", "indexed": true }, { "type": "uint256[2]", "name": "token_amounts", "indexed": false }, { "type": "uint256[2]", "name": "fees", "indexed": false }, { "type": "uint256", "name": "token_supply", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "RemoveLiquidityOne", "inputs": [{ "type": "address", "name": "provider", "indexed": true }, { "type": "uint256", "name": "token_amount", "indexed": false }, { "type": "uint256", "name": "coin_amount", "indexed": false }, { "type": "uint256", "name": "token_supply", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "RemoveLiquidityImbalance", "inputs": [{ "type": "address", "name": "provider", "indexed": true }, { "type": "uint256[2]", "name": "token_amounts", "indexed": false }, { "type": "uint256[2]", "name": "fees", "indexed": false }, { "type": "uint256", "name": "invariant", "indexed": false }, { "type": "uint256", "name": "token_supply", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "CommitNewAdmin", "inputs": [{ "type": "uint256", "name": "deadline", "indexed": true }, { "type": "address", "name": "admin", "indexed": true }], "anonymous": false, "type": "event" }, { "name": "NewAdmin", "inputs": [{ "type": "address", "name": "admin", "indexed": true }], "anonymous": false, "type": "event" }, { "name": "CommitNewFee", "inputs": [{ "type": "uint256", "name": "deadline", "indexed": true }, { "type": "uint256", "name": "fee", "indexed": false }, { "type": "uint256", "name": "admin_fee", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "NewFee", "inputs": [{ "type": "uint256", "name": "fee", "indexed": false }, { "type": "uint256", "name": "admin_fee", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "RampA", "inputs": [{ "type": "uint256", "name": "old_A", "indexed": false }, { "type": "uint256", "name": "new_A", "indexed": false }, { "type": "uint256", "name": "initial_time", "indexed": false }, { "type": "uint256", "name": "future_time", "indexed": false }], "anonymous": false, "type": "event" }, { "name": "StopRampA", "inputs": [{ "type": "uint256", "name": "A", "indexed": false }, { "type": "uint256", "name": "t", "indexed": false }], "anonymous": false, "type": "event" }, { "outputs": [], "inputs": [{ "type": "address", "name": "_owner" }, { "type": "address[2]", "name": "_coins" }, { "type": "address", "name": "_pool_token" }, { "type": "address", "name": "_base_pool" }, { "type": "uint256", "name": "_A" }, { "type": "uint256", "name": "_fee" }, { "type": "uint256", "name": "_admin_fee" }], "stateMutability": "nonpayable", "type": "constructor" }, { "name": "A", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 5205 }, { "name": "A_precise", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 5167 }, { "name": "get_virtual_price", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 992854 }, { "name": "calc_token_amount", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256[2]", "name": "amounts" }, { "type": "bool", "name": "is_deposit" }], "stateMutability": "view", "type": "function", "gas": 3939870 }, { "name": "add_liquidity", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256[2]", "name": "amounts" }, { "type": "uint256", "name": "min_mint_amount" }], "stateMutability": "nonpayable", "type": "function", "gas": 6138492 }, { "name": "get_dy", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "int128", "name": "i" }, { "type": "int128", "name": "j" }, { "type": "uint256", "name": "dx" }], "stateMutability": "view", "type": "function", "gas": 2390368 }, { "name": "get_dy_underlying", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "int128", "name": "i" }, { "type": "int128", "name": "j" }, { "type": "uint256", "name": "dx" }], "stateMutability": "view", "type": "function", "gas": 2393485 }, { "name": "exchange", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "int128", "name": "i" }, { "type": "int128", "name": "j" }, { "type": "uint256", "name": "dx" }, { "type": "uint256", "name": "min_dy" }], "stateMutability": "nonpayable", "type": "function", "gas": 2617568 }, { "name": "exchange_underlying", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "int128", "name": "i" }, { "type": "int128", "name": "j" }, { "type": "uint256", "name": "dx" }, { "type": "uint256", "name": "min_dy" }], "stateMutability": "nonpayable", "type": "function", "gas": 2632475 }, { "name": "remove_liquidity", "outputs": [{ "type": "uint256[2]", "name": "" }], "inputs": [{ "type": "uint256", "name": "_amount" }, { "type": "uint256[2]", "name": "min_amounts" }], "stateMutability": "nonpayable", "type": "function", "gas": 163289 }, { "name": "remove_liquidity_imbalance", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256[2]", "name": "amounts" }, { "type": "uint256", "name": "max_burn_amount" }], "stateMutability": "nonpayable", "type": "function", "gas": 6138317 }, { "name": "calc_withdraw_one_coin", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256", "name": "_token_amount" }, { "type": "int128", "name": "i" }], "stateMutability": "view", "type": "function", "gas": 4335 }, { "name": "remove_liquidity_one_coin", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256", "name": "_token_amount" }, { "type": "int128", "name": "i" }, { "type": "uint256", "name": "_min_amount" }], "stateMutability": "nonpayable", "type": "function", "gas": 3827137 }, { "name": "ramp_A", "outputs": [], "inputs": [{ "type": "uint256", "name": "_future_A" }, { "type": "uint256", "name": "_future_time" }], "stateMutability": "nonpayable", "type": "function", "gas": 151906 }, { "name": "stop_ramp_A", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 148667 }, { "name": "commit_new_fee", "outputs": [], "inputs": [{ "type": "uint256", "name": "new_fee" }, { "type": "uint256", "name": "new_admin_fee" }], "stateMutability": "nonpayable", "type": "function", "gas": 110491 }, { "name": "apply_new_fee", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 97272 }, { "name": "revert_new_parameters", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 21925 }, { "name": "commit_transfer_ownership", "outputs": [], "inputs": [{ "type": "address", "name": "_owner" }], "stateMutability": "nonpayable", "type": "function", "gas": 74663 }, { "name": "apply_transfer_ownership", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 60740 }, { "name": "revert_transfer_ownership", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 22015 }, { "name": "admin_balances", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256", "name": "i" }], "stateMutability": "view", "type": "function", "gas": 3511 }, { "name": "withdraw_admin_fees", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 9248 }, { "name": "donate_admin_fees", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 74995 }, { "name": "kill_me", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 38028 }, { "name": "unkill_me", "outputs": [], "inputs": [], "stateMutability": "nonpayable", "type": "function", "gas": 22165 }, { "name": "coins", "outputs": [{ "type": "address", "name": "" }], "inputs": [{ "type": "uint256", "name": "arg0" }], "stateMutability": "view", "type": "function", "gas": 2250 }, { "name": "balances", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [{ "type": "uint256", "name": "arg0" }], "stateMutability": "view", "type": "function", "gas": 2280 }, { "name": "fee", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2201 }, { "name": "admin_fee", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2231 }, { "name": "owner", "outputs": [{ "type": "address", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2261 }, { "name": "base_pool", "outputs": [{ "type": "address", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2291 }, { "name": "base_virtual_price", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2321 }, { "name": "base_cache_updated", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2351 }, { "name": "base_coins", "outputs": [{ "type": "address", "name": "" }], "inputs": [{ "type": "uint256", "name": "arg0" }], "stateMutability": "view", "type": "function", "gas": 2490 }, { "name": "initial_A", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2411 }, { "name": "future_A", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2441 }, { "name": "initial_A_time", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2471 }, { "name": "future_A_time", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2501 }, { "name": "admin_actions_deadline", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2531 }, { "name": "transfer_ownership_deadline", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2561 }, { "name": "future_fee", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2591 }, { "name": "future_admin_fee", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2621 }, { "name": "future_owner", "outputs": [{ "type": "address", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function", "gas": 2651 }];
const ocbPercentage = '1';
let minimumDeposit = '1000000000000000000000'; //10k Dollars
//**************************************************************************************** */
//-------curve-vault--ERC-20-TOKENS-------------------------//
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDN = "0x674C6Ad92Fd080e4004b2312b45f796a192D27a0";
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

const getAmountToInvest = (_vaultNAV, _vaultNAVWithoutStrategy, _ocbPercentage) => {
    let optimalSafeBalance = new BN(_vaultNAV).mul(new BN(_ocbPercentage)).div(new BN('100'));
    let toDeposit = new BN(_vaultNAVWithoutStrategy).sub(optimalSafeBalance);
    if (toDeposit.isNeg() || toDeposit.lt(new BN(minimumDeposit)))
        return new BN('0');
    else
        return toDeposit
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
        const curvePool = new web3.eth.Contract(CRVASSETPOOL, curveVaultAddress)
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
        console.log([...nonBaseAssetMapping.keys()], [...nonBaseAssetMapping.values()])
        let estimatedReturns = await curve3Pool.methods.calc_token_amount([balanceOfDAI, balanceOfUSDT, balanceOfUSDC], true).call();


        let dataParams = web3.eth.abi.encodeParameters(
            ['address[3]', 'uint256[3]', 'uint256', 'address[]', 'uint256[]'],
            [
                [DAI, USDC, USDT],
                [baseAssetMapping.get(DAI) === undefined ? '0' : (baseAssetMapping.get(USDC)), baseAssetMapping.get(USDT) === undefined ? '0' : (baseAssetMapping.get(USDC)), baseAssetMapping.get(USDT) === undefined ? '0' : (baseAssetMapping.get(USDT))],
                estimatedReturns === '0' ? '0' : '1', // TODO : Find proper method to calculate 
                [...nonBaseAssetMapping.keys()],
                [...nonBaseAssetMapping.values()]
            ]
        );

        console.log(dataParams);
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
    let tx= relayer.sendTransaction({
            singleAssetStrategyMinter, data,  speed: 'fast'
        });
    return tx;
    } catch (error) {
        console.log(error)
    }
}
exports.handler = async (event) => {
    const relayer = new Relayer(event);
    const vaults = await axios.get(`${BASE_URL}/vault`);
    if ((vaults.data.status) && (vaults.data.data)) {
        await Promise.all((vaults.data.data).map(async (vault) => {
            try {
                const yieldsterContractInstance = new web3.eth.Contract(yieldsterABI, vault.vaultAddress);

                let vaultNAV = await yieldsterContractInstance.methods.getVaultNAV().call();
                let vaultNAVWithoutStrategy = await yieldsterContractInstance.methods.getVaultNAVWithoutStrategyToken().call();
                /**
                 To check if optimal cash balance is present in the vault for strategy deposit
                 */
                let amountToInvest = getAmountToInvest(vaultNAV, vaultNAVWithoutStrategy, '1');

                if (!amountToInvest.eq(new BN('0'))) {
                    let vaultActiveStrategy = await yieldsterContractInstance.methods.getVaultActiveStrategy().call();
                    vaultActiveStrategy = vaultActiveStrategy[0];

                    if (vaultActiveStrategy.toLowerCase() === singleAssetStrategyAddress.toLowerCase()) {
                        /*** Calling EARN*/
                        let earnHash = await earn(vault, amountToInvest, yieldsterContractInstance);
                        if (earnHash.status){
                            let response = await sendTransaction(relayer, earnHash.response);
                            console.log(response)
                        }

                    } else {
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

if (require.main === module) {
    require('dotenv').config();
    const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}