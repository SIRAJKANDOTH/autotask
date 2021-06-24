const {
    Relayer
} = require('defender-relay-client');
const axios = require('axios')

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/df57c5da4e444a4c94b362aeec143e9e")
let web3 = new Web3(provider);

const safeContractABI = require('yieldster-abi/contracts/YieldsterVault.json').abi;
const strategyABI = require('yieldster-abi/contracts/IStrategy.json').abi;
const priceModuleABI = require('yieldster-abi/contracts/IPriceModule.json').abi;

const livaOneMinter = "0x653e276642654c63b9A5Bf2ed0D41f89c4B80034";
const priceModuleAddress = "0x7DC54c1c19db05f0127CE53cE33304b4835eC41A";


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
        const maxAPYProtocol = await axios.get(`http://localhost:8050/defender/max-apy?vaultAddress=${vaultAddress}&strategyAddress=${strategyAddress}`)
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

exports.setActiveProtocol = (relayer, vaultAddress, protocolAddress) => {
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
        return 'success'
        // let activeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
        // return activeProtocolHash
    } catch (error) {
        return `Error occured in setting activeProtocl,${error.message}`
    }
}

exports.changeProtocol = (relayer, vaultAddress, protocolAddress) => {
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
        // let changeProtocolHash = await exports.sentInstruction(relayer, livaOneMinter, minterInstruction);
        // return changeProtocolHash
    } catch (error) {
        return `Error occured in change-protocol,${error.message}`
    }
}

exports.callingEARN = (relayer, safeAddress, vaultAssetList, totalAssetPriceList) => {
    try {
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
        }, [safeAddress, vaultAssetList, totalAssetPriceList]);
        earnInstruction = earnInstruction.substring(2)

        // let earnInstructionHash = await exports.sentInstruction(relayer, livaOneMinter, earnInstruction)
        // console.log("earnInstructionHash:", earnInstructionHash)
        // return earnInstructionHash
        console.log("EarnInstruction: ", earnInstruction)
        return 'success'
    } catch (error) {
        return `Error occured while calling EARN, ${error.message}`
    }
}

exports.handler = async function (credentials) {

    const relayer = new Relayer(credentials);

    let priceModule = new web3.eth.Contract(priceModuleABI, priceModuleAddress);

    const vaults = await axios.get(`http://localhost:8050/vault`)

    if ((vaults.data.status) && ((vaults.data.data).length > 0)) {

        await Promise.all((vaults.data.data).map(async (vault) => {
            try {
                let safeContract = new web3.eth.Contract(safeContractABI, vault.vaultAddress);

                let vaultActiveStrategy = await safeContract.methods.getVaultActiveStrategy().call();
                vaultActiveStrategy = vaultActiveStrategy[0];

                if (vaultActiveStrategy && vaultActiveStrategy != '0x0000000000000000000000000000000000000000') {
                    let strategyInstance = new web3.eth.Contract(strategyABI, vaultActiveStrategy);
                    let vaultActiveProtocol = await strategyInstance.methods.getActiveProtocol(vault.vaultAddress).call();
                    // To activate a protocol if no active protocol is present 
                    if (vaultActiveProtocol && vaultActiveProtocol == "0x0000000000000000000000000000000000000000") {
                        let protocolAddressData = await exports.getMaxAPYProtocol(vault.vaultAddress, vaultActiveStrategy)
                        if (protocolAddressData.protocolAddress != 0) {
                            let activeProtocolHash = await exports.setActiveProtocol(relayer, vault.vaultAddress, protocolAddressData.protocolAddress)
                            return activeProtocolHash
                        } else {
                            return 'Error occured in getting maxAPYProtocol'
                        }
                    }
                    // To check if there is a need to change protocol
                    else if (vaultActiveProtocol && vaultActiveProtocol != "0x0000000000000000000000000000000000000000") {
                        // Getting APY value of current active protocol
                        const protocolAPYData = await axios.get(`http://localhost:8050/defender/protocol-apy?protocolAddress=${vaultActiveProtocol}`)
                        // Getting protocol with max APY active in the strategy
                        let maxProtocolData = await exports.getMaxAPYProtocol(vault.vaultAddress, vaultActiveStrategy)

                        if ((protocolAPYData.data.status) && (protocolAPYData.data.data) && (maxProtocolData) && (maxProtocolData.protocolAddress)) {
                            if ((protocolAPYData.data.data.oneWeekAPY) < (maxProtocolData.oneWeekAPY)) {
                                let changeProtocolHash = await exports.changeProtocol(relayer, vault.vaultAddress, (maxProtocolData.protocolAddress))
                                return changeProtocolHash
                            } else {
                                console.log("No need to change protocol")
                            }
                        }
                    }
                    let vaultAssets = [...new Set([...(vault.depositableAssets).map(x => x.assetAddress), ...(vault.withdrawableAssets).map(x => x.assetAddress)])]
                    console.log("vaultAssest: ", vaultAssets)
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
                    _assetArr.sort((a, b) => {
                        return b.assetTotalPrice - a.assetTotalPrice;
                    })

                    let assetTotalPriceArr = _assetArr.map((val) => val.assetTotalPrice);
                    let vaultAssetList = _assetArr.map((val) => val.assetAddress);
                    let assetTotalBalance = _assetArr.map((val) => val.assetTotalBalance);
                    console.log("vaultAssetList: ", vaultAssetList, "\nassetTotalPriceArr", assetTotalPriceArr, "\nassetTotalBalance", assetTotalBalance)
                    let earnData = await exports.callingEARN(relayer, vault.vaultAddress, vaultAssetList, assetTotalBalance)
                    return earnData
                } else {
                    return 'No active strategy present.'
                }
            } catch (error) {
                console.log(error)
            }
        }))
    } else {
        return 'No vault present.'
    }
}