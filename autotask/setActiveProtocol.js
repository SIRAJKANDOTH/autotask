const {
    Relayer
} = require('defender-relay-client');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/f282de0c6571487aa01db622d6949517");
let web3 = new Web3(provider);

const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/IPriceModule.json').abi;

exports.sentInstruction = async function (relayer, minterAddress, instruction) {
    const txRes = await relayer.sendTransaction({
        to: minterAddress,
        data: instruction,
        speed: 'fast',
        gasLimit: '1000000',
    });
    return `Transaction hash: ${txRes.hash}`;
}

exports.handler = async function (credentials) {

    const relayer = new Relayer(credentials);

    let safeAddress = "0x553D4E55A452c0f3Cc64003ACD970D8df935b52e";
    let livaOneMinter = "0x653e276642654c63b9A5Bf2ed0D41f89c4B80034";
    let strategyAddress = "0x191ab6a09fDF0EdDe8E6Fe6E3c725A60c2aD6F3E";
    let priceModuleAddress = "0x7DC54c1c19db05f0127CE53cE33304b4835eC41A";
    let protocolAddress = "0x66e388881667d3CFa565fbC5bfef3119Fac3C9a1";
    let activeProtocolHash;

    let strategyInstance = new web3.eth.Contract(strategyABI, strategyAddress);
    let safeContract = new web3.eth.Contract(safeContractABI, safeAddress);
    let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);


    let vaultActiveProtocol = await strategyInstance.methods.getActiveProtocol(safeAddress).call();
    console.log("getActiveProtocol: ", vaultActiveProtocol)
    if (vaultActiveProtocol && vaultActiveProtocol == "0x0000000000000000000000000000000000000000") {
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
        }, [safeAddress, instruction]);

        minterInstruction = minterInstruction.substring(2)
        console.log(`Sending protocol set instruction:- setActiveProtocol(address) with hash ${minterInstruction}, to safe :- ${safeAddress}`);
        activeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
        console.log("ActiveProtocolHash: ", activeProtocolHash)
    }

    let _vaultAssetList = [{
        assetAddress: "0x9481EE22575E9173fa244Efe74F3aE64a8222aD4",
        assetFeedAddress: "0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF"
    }]

    let _assetArr = await Promise.all(
        _vaultAssetList.map(async (value) => {
            let assetBalance = await safeContract.methods.getTokenBalance(value.assetAddress).call();
            let assetPrice = await priceModule.methods.getUSDPrice(value.assetAddress).call();
            return {
                assetAddress: value.assetAddress,
                assetTotalPrice: assetBalance * assetPrice,
                assetTotalBalance: assetBalance
            };
        })
    );
    _assetArr.sort((a, b) => {
        return b.assetTotalPrice - a.assetTotalPrice;
    })

    let assetTotalPriceArr = _assetArr.map((val) => val.assetTotalPrice);
    let vaultAssetList = _assetArr.map((val) => val.assetAddress);
    let assetTotalBalance = _assetArr.map((val) => val.assetTotalBalance);

    console.log("assetTotalPriceArr:",assetTotalPriceArr)
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
        ]
    }, [safeAddress, vaultAssetList, assetTotalPriceArr]);
    earnInstruction = earnInstruction.substring(2)

    let earnInstructionHash = await exports.sentInstruction(relayer, livaOneMinter, earnInstruction)
    console.log("earnInstructionHash:", earnInstructionHash)
    return "success"
}