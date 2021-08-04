const {
    Relayer
} = require('defender-relay-client');
const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
let web3 = new Web3(provider);

const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const IVaultABI = require('yieldster-abi/contracts/IVault.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20.json').abi;
const ERC20Detailed = require("yieldster-abi/contracts/ERC20Detailed.json").abi;
const CRVEUROPOOL = [{"name":"TokenExchange","inputs":[{"type":"address","name":"buyer","indexed":true},{"type":"int128","name":"sold_id","indexed":false},{"type":"uint256","name":"tokens_sold","indexed":false},{"type":"int128","name":"bought_id","indexed":false},{"type":"uint256","name":"tokens_bought","indexed":false}],"anonymous":false,"type":"event"},{"name":"AddLiquidity","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256[2]","name":"token_amounts","indexed":false},{"type":"uint256[2]","name":"fees","indexed":false},{"type":"uint256","name":"invariant","indexed":false},{"type":"uint256","name":"token_supply","indexed":false}],"anonymous":false,"type":"event"},{"name":"RemoveLiquidity","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256[2]","name":"token_amounts","indexed":false},{"type":"uint256[2]","name":"fees","indexed":false},{"type":"uint256","name":"token_supply","indexed":false}],"anonymous":false,"type":"event"},{"name":"RemoveLiquidityOne","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256","name":"token_amount","indexed":false},{"type":"uint256","name":"coin_amount","indexed":false},{"type":"uint256","name":"token_supply","indexed":false}],"anonymous":false,"type":"event"},{"name":"RemoveLiquidityImbalance","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256[2]","name":"token_amounts","indexed":false},{"type":"uint256[2]","name":"fees","indexed":false},{"type":"uint256","name":"invariant","indexed":false},{"type":"uint256","name":"token_supply","indexed":false}],"anonymous":false,"type":"event"},{"name":"CommitNewAdmin","inputs":[{"type":"uint256","name":"deadline","indexed":true},{"type":"address","name":"admin","indexed":true}],"anonymous":false,"type":"event"},{"name":"NewAdmin","inputs":[{"type":"address","name":"admin","indexed":true}],"anonymous":false,"type":"event"},{"name":"CommitNewFee","inputs":[{"type":"uint256","name":"deadline","indexed":true},{"type":"uint256","name":"fee","indexed":false},{"type":"uint256","name":"admin_fee","indexed":false}],"anonymous":false,"type":"event"},{"name":"NewFee","inputs":[{"type":"uint256","name":"fee","indexed":false},{"type":"uint256","name":"admin_fee","indexed":false}],"anonymous":false,"type":"event"},{"name":"RampA","inputs":[{"type":"uint256","name":"old_A","indexed":false},{"type":"uint256","name":"new_A","indexed":false},{"type":"uint256","name":"initial_time","indexed":false},{"type":"uint256","name":"future_time","indexed":false}],"anonymous":false,"type":"event"},{"name":"StopRampA","inputs":[{"type":"uint256","name":"A","indexed":false},{"type":"uint256","name":"t","indexed":false}],"anonymous":false,"type":"event"},{"outputs":[],"inputs":[{"type":"address","name":"_owner"},{"type":"address[2]","name":"_coins"},{"type":"address","name":"_pool_token"},{"type":"uint256","name":"_A"},{"type":"uint256","name":"_fee"},{"type":"uint256","name":"_admin_fee"}],"stateMutability":"nonpayable","type":"constructor"},{"name":"A","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":5199},{"name":"A_precise","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":5161},{"name":"get_virtual_price","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1009573},{"name":"calc_token_amount","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[2]","name":"amounts"},{"type":"bool","name":"is_deposit"}],"stateMutability":"view","type":"function","gas":4015448},{"name":"add_liquidity","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[2]","name":"amounts"},{"type":"uint256","name":"min_mint_amount"}],"stateMutability":"nonpayable","type":"function","gas":6188356},{"name":"get_dy","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"int128","name":"i"},{"type":"int128","name":"j"},{"type":"uint256","name":"dx"}],"stateMutability":"view","type":"function","gas":2447061},{"name":"exchange","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"int128","name":"i"},{"type":"int128","name":"j"},{"type":"uint256","name":"dx"},{"type":"uint256","name":"min_dy"}],"stateMutability":"nonpayable","type":"function","gas":2610010},{"name":"remove_liquidity","outputs":[{"type":"uint256[2]","name":""}],"inputs":[{"type":"uint256","name":"_amount"},{"type":"uint256[2]","name":"min_amounts"}],"stateMutability":"nonpayable","type":"function","gas":168108},{"name":"remove_liquidity_imbalance","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[2]","name":"amounts"},{"type":"uint256","name":"max_burn_amount"}],"stateMutability":"nonpayable","type":"function","gas":6188006},{"name":"calc_withdraw_one_coin","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"_token_amount"},{"type":"int128","name":"i"}],"stateMutability":"view","type":"function","gas":1489},{"name":"remove_liquidity_one_coin","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"_token_amount"},{"type":"int128","name":"i"},{"type":"uint256","name":"_min_amount"}],"stateMutability":"nonpayable","type":"function","gas":3875211},{"name":"ramp_A","outputs":[],"inputs":[{"type":"uint256","name":"_future_A"},{"type":"uint256","name":"_future_time"}],"stateMutability":"nonpayable","type":"function","gas":151774},{"name":"stop_ramp_A","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":148535},{"name":"commit_new_fee","outputs":[],"inputs":[{"type":"uint256","name":"new_fee"},{"type":"uint256","name":"new_admin_fee"}],"stateMutability":"nonpayable","type":"function","gas":110371},{"name":"apply_new_fee","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":97152},{"name":"revert_new_parameters","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":21805},{"name":"commit_transfer_ownership","outputs":[],"inputs":[{"type":"address","name":"_owner"}],"stateMutability":"nonpayable","type":"function","gas":74543},{"name":"apply_transfer_ownership","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":60620},{"name":"revert_transfer_ownership","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":21895},{"name":"admin_balances","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"i"}],"stateMutability":"view","type":"function","gas":3391},{"name":"withdraw_admin_fees","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":14947},{"name":"donate_admin_fees","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":74875},{"name":"kill_me","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":37908},{"name":"unkill_me","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":22045},{"name":"coins","outputs":[{"type":"address","name":""}],"inputs":[{"type":"uint256","name":"arg0"}],"stateMutability":"view","type":"function","gas":2130},{"name":"balances","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"arg0"}],"stateMutability":"view","type":"function","gas":2160},{"name":"fee","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2081},{"name":"admin_fee","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2111},{"name":"owner","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2141},{"name":"lp_token","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2171},{"name":"initial_A","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2201},{"name":"future_A","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2231},{"name":"initial_A_time","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2261},{"name":"future_A_time","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2291},{"name":"admin_actions_deadline","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2321},{"name":"transfer_ownership_deadline","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2351},{"name":"future_fee","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2381},{"name":"future_admin_fee","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2411},{"name":"future_owner","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2441}];



const BASE_URL = "https://api.yieldster.finance"
const crvEuroPoolAddress = "0x0Ce6a5fF5217e38315f87032CF90686C96627CAA";

const threshold = 0;
const minimumInvestmentDuration = 7;
const strategyPortfolio = 0.5;
const slippage = 0.01;

const sEUR = "0xD71eCFF9342A5Ced620049e616c5035F1dB98620";
const EURS = "0xdB25f211AB05b1c97D595516F45794528a807ad8";
const ycrvEURSProtocol = "0x25212Df29073FfFA7A67399AcEfC2dd75a831A1A";
const euroPlusMinter = "0xc5f256C14AD631fe93c9d75Df3F1B80E9B21f91E";
const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const relayerAddress = "0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0";
const euroPlus = "0x2A8De6D912dC12b173aBC0f354960dC314Ea35e5";


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
        let currentGasPriceInWEI = await web3.eth.getGasPrice();
        let gasUsedInUSD = (currentGasPriceInWEI * gasUsed * oneEtherInUSD) / (10 ** 18)
        return gasUsedInUSD;
    } catch (error) {
        throw error;
    }

}

exports.earn = async (relayer,relayerAddress,vault, vaultActiveProtocol, vaultNAV, ocb) => {
    try {
        let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
        let protocolContract = new web3.eth.Contract(IVaultABI, vaultActiveProtocol);
        let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
        let curveEuroPool = new web3.eth.Contract(CRVEUROPOOL, crvEuroPoolAddress);

        let balanceOfsEUR = await (await safeContract.methods.getTokenBalance(sEUR).call()).toString();
        let balanceOfEURS = await (await safeContract.methods.getTokenBalance(EURS).call()).toString();
        let returnToken = await protocolContract.methods.token().call();
        let returnTokenPrice = await priceModule.methods.getUSDPrice(returnToken).call();

        let vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]
        // let vaultAssets = [EURS, sEUR]
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
            _assetArr.filter(value => {
                return [EURS, sEUR].indexOf(value.assetAddress) == -1
            }).map(async (val) => {
                let obj = {};
                if ([EURS, sEUR].indexOf(val.assetAddress) == -1)
                    obj.assetAddress = val.assetAddress,
                        obj.assetTotalBalance = val.assetBalance
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

        let estimatedReturns = await curveEuroPool.methods.calc_token_amount([balanceOfEURS, balanceOfsEUR], true).call();
        console.log("estimatedReturns", estimatedReturns)

        console.log(nonCrvAssetList)
        console.log(nonCrvAssetTotalBalance)
        console.log("balance",[balanceOfEURS, balanceOfsEUR])
        estimatedReturns = web3.utils.fromWei(estimatedReturns) * (1 - slippage);
        let dataParams = web3.eth.abi.encodeParameters(
            ['address[2]', 'uint256[2]', 'uint256', 'address[]', 'uint256[]'],
            [
                [EURS, sEUR],
                [balanceOfEURS, balanceOfsEUR],
                web3.utils.toWei(estimatedReturns.toString()),
                nonCrvAssetList,
                nonCrvAssetTotalBalance
            ]
        );

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
        // earnInstruction = earnInstruction.substring(2)

        console.log("EarnInstruction: ", earnInstruction)
        let gasUsed = await exports.estimateGas(relayerAddress, euroPlusMinter, earnInstruction);
        let gasCost = await exports.getGasUsedInUSD(gasUsed);
        console.log("GasCost: ", gasCost)

        let params = {
            type: 'earn protocol',
            gasUsed,
            gasCost,
            vaultAddress: vault.vaultAddress,
            earnInstruction,
            vaultActiveProtocol,
            toEarn,
            returnTokenPrice,
            expectedReturnsInYVTokens
        }
        console.log(params);


        if (((toEarn / (returnTokenPrice)) >= expectedReturnsInYVTokens) && toEarn - gasCosts > gasCosts) {
            console.log("Earn condition satisfied")
            // let earnInstructionHash = await exports.sentInstruction(relayer, euroPlusMinter, earnInstruction)
            // console.log("earnInstructionHash:", earnInstructionHash)
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
                let vaultNAVInStrategy = (web3.utils.toBN(vaultNAV).sub(web3.utils.toBN(vaultNAVWithoutStrategy))).toString();
                vaultActiveStrategy = vaultActiveStrategy[0];
                let ocb = web3.utils.fromWei(vaultNAVWithoutStrategy) * 0.1;
                if (vaultActiveStrategy === euroPlus) {
                    let strategyInstance = new web3.eth.Contract(strategyABI, vaultActiveStrategy);
                    /*** Calling EARN*/
                    let earnHash = await exports.earn(relayer,relayerAddress, vault, ycrvEURSProtocol, vaultNAV, ocb);
                    return earnHash.response

                } else {
                    return 'Euro plus strategy not present.' // To check if return needed
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
