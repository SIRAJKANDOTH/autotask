const { Relayer } = require('defender-relay-client');
const axios = require('axios')
const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider(token)

const provider = new Web3.providers.WebsocketProvider("ws://localhost:8545")
let web3 = new Web3(provider);

const priceModuleABI = require('yieldster-abi/contracts/PriceModule.json').abi;
const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const safeMinterABI = require('yieldster-abi/contracts/SafeMinter.json').abi;
const ERC20 = require('yieldster-abi/contracts/ERC20Detailed.json').abi;

const priceModuleAddress = "0xc98435837175795d216547a8edc9e0472604bbda";
const safeMinter = "0xd06d64f90f7d3ce5620c32e94306263c406703d7";
const gasOracle = "0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C";
const relayerAddress = "0x5091aF48BEB623b3DA0A53F726db63E13Ff91df9";

const BASE_URL = "http://localhost:8050";
// "https://api.yieldster.finance"

exports.sentInstruction = async function (relayer, minterAddress, instruction, gaslimit) {
    const txRes = await relayer.sendTransaction({
        to: minterAddress,
        data: instruction,
        speed: 'fast',
        gasLimit: gaslimit,
    });
    return `Transaction hash: ${txRes.hash}`;
}

const sendTransaction = async (txData, from, to, estimatedGas) => {
    try {
        const tx = {
            to,
            gas: estimatedGas + 10000,
            data: txData,
        };
        let signedTxn = await web3.eth.accounts.signTransaction(
            tx,
        );

        // let txn = await web3.eth.sendSignedTransaction(signedTxn.raw || signedTxn.rawTransaction);
        return { status: true, txn: signedTxn.transactionHash };
    } catch (error) {
        console.log(error)
        return { status: false, error }
    }
}

const getReimbursedTxns = async (txns) => {
    let txnReceipts = txns.filter((element) => {
        return (('paybackReceipt' in element) === true);
    }).map(element => { return { transactionHash: element.transactionHash, paybackReceipt: element.paybackReceipt, isReimbursed: false } });

    const mapping = new Map();
    let receiptStatus = await Promise.all(
        txnReceipts.map(async (element) => {
            let status = await (await web3.eth.getTransactionReceipt(element.paybackReceipt)).status;
            let obj = element;

            if (status === true) {
                obj.isReimbursed = true;
                mapping.set(element.transactionHash, element.paybackReceipt)
            }
            return obj;
        })
    );
    return mapping;
}

const buildTxnArray = (txnsArr) => {

    let gasTokenArr = [];
    let beneficiaryArr = [];
    let gasCostArr = [];
    txnsArr.forEach(element => {
        gasTokenArr.push(element.gasToken);
        beneficiaryArr.push(element.beneficiary);
        gasCostArr.push(element.gascost);
    })

    let returnArr = [gasTokenArr, beneficiaryArr, gasCostArr];
    return (returnArr);
}

const sortAssetArr = (arr) => {
    arr.sort((a, b) => {
        return b.assetPriceInEther - a.assetPriceInEther;
    })
    return arr;
}

const createTxn = (executorPaybackArgs, safeAddress) => {
    let executorPaybackInstruction = web3.eth.abi.encodeFunctionCall({
        name: "paybackExecutor",
        type: "function",
        inputs: [{
            type: "uint256[]",
            name: "gasCost"
        },
        {
            type: "address[]",
            name: "beneficiary"
        },
        {
            type: "address[]",
            name: "gasToken"
        }
        ]
    }, [
        executorPaybackArgs[2],
        executorPaybackArgs[1],
        executorPaybackArgs[0]
    ]);
    executorPaybackInstruction = executorPaybackInstruction.substring(2)

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
    }, [safeAddress, executorPaybackInstruction]);

    return minterInstruction;
}

exports.handler = async function (event) {
    // const relayer = new Relayer(event);
    let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);
    let gasPrice = await (await priceModule.methods.getLatestPrice(gasOracle).call())['0'];
    let etherPriceInUSD = await priceModule.methods.getUSDPrice("0x0000000000000000000000000000000000000000").call();

    const vaults = await axios.get(`${BASE_URL}/vault`);
    if ((vaults.data.status) && ((vaults.data.data).length > 0)) {
        await Promise.all((vaults.data.data).map(async (vault) => {
            let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);
            let vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])] //UNCOMMENT
            // let vaultAssets = ['0xdac17f958d2ee523a2206206994597c13d831ec7', '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'];

        let _assetArr = (await Promise.all(
            vaultAssets.map(async (assetAddress) => {
                let assetBalance = await safeContract.methods.getTokenBalance(assetAddress).call();
                let assetPrice = await priceModule.methods.getUSDPrice(assetAddress).call();
                let token = new web3.eth.Contract(ERC20, assetAddress);
                let decimals = await token.methods.decimals().call();
                return {
                    assetAddress: assetAddress,
                    assetPrice,
                    singleAssetPriceInEther: web3.utils.toWei((web3.utils.fromWei(assetPrice) / web3.utils.fromWei(etherPriceInUSD)).toFixed(18).toString()),
                    assetPriceInEther: web3.utils.toWei((web3.utils.fromWei(assetPrice) / web3.utils.fromWei(etherPriceInUSD) * (assetBalance / (10 ** decimals))).toFixed(18).toString()),
                    assetTotalPriceInUSD: web3.utils.toWei(((assetBalance / (10 ** decimals)) * web3.utils.fromWei(assetPrice.toString())).toString()),
                    assetBalance,
                    decimals
                };
            })
        )).filter(element => element.assetBalance !== '0');

        _assetArr = sortAssetArr(_assetArr);

        let txn = await (await axios.get(`${BASE_URL}/defender/getpendingtxns`, {
            data: {
                    "safeaddress": vault.vaultAddress
            }
        })).data.data;

        const txns = txn[0].transactions;

        let reimbursedTxns = await getReimbursedTxns(txns);

        let toBeReimbursed = txns.filter(element => {
            return (reimbursedTxns.get(element.transactionHash) === undefined)
        });

        let toBeSentTxn = [];

        for (let index = 0; index < toBeReimbursed.length; index++) {
            const element = toBeReimbursed[index];
            let obj = {};
            let totalTxnCost = web3.utils.toWei((element.gascosts * web3.utils.fromWei(element.gasprice)).toString());
            _assetArr = sortAssetArr(_assetArr);
            if (totalTxnCost < _assetArr[0].assetPriceInEther) {
                obj.transactionHash = element.transactionHash;
                obj.gasToken = _assetArr[0].assetAddress;
                obj.beneficiary = element.beneficiary;
                obj.gascost = totalTxnCost;
                obj.tokenCount = (((web3.utils.fromWei(totalTxnCost) / web3.utils.fromWei(_assetArr[0].singleAssetPriceInEther)) * (10 ** _assetArr[0].decimals)).toFixed(0)).toString();
                _assetArr[0].assetPriceInEther = (_assetArr[0].assetPriceInEther - totalTxnCost).toString();
                toBeSentTxn.push(obj);
            }
            else {
                break;
            }
        }
        const executorPaybackArgs = buildTxnArray(toBeSentTxn)
            let minterInstruction = createTxn(executorPaybackArgs, vault.vaultAddress);
        let estimatedGas = await web3.eth.estimateGas({
            to: safeMinter,
                from: relayerAddress,
            data: minterInstruction
            });

            let txnHash = await sendTransaction(minterInstruction, relayerAddress, safeMinter, estimatedGas);

        if (txnHash.status) {
            let res = toBeReimbursed.map(async (element) => {
                return { safeaddress: vault.vaultAddress, transactionHash: element.transactionHash, paybackReceipt: txnHash.txn }
            });
            let updatetxncost = await axios.patch(`${BASE_URL}/defender/updatetxncost`, res)
        }
        }));
    }

}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    require('dotenv').config();
    const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}
