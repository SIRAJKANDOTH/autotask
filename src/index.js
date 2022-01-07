const { Relayer } = require('defender-relay-client');
const { KeyValueStoreClient } = require('defender-kvstore-client');

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/af7e2e37cd6545479e7523246fbaaa08")
let web3 = new Web3(provider);

const generateInstruction = async () => {
  try {
    let instruction = web3.eth.abi.encodeFunctionCall({
      name: "push",
      type: "function",
      inputs: [{
        type: "uint256",
        name: "i"
      }]
    }, ["10"]);
    console.log(instruction);
    return instruction;
  } catch (error) {
    console.log(error)
    return error
  }
}

exports.handler = async function (event) {
  try {
    const relayer = new Relayer(event);
    // const store = new KeyValueStoreClient(event);
    let instruction = await generateInstruction();
    const txRes = await relayer.sendTransaction({
      to: '0xb22acec9bef90ebffc79c890a78c88323e85202b',
      data:instruction,
      speed: 'fast',
      gasLimit: '1000000',
    });
    
    console.log(txRes);
    
    // await store.put('myKey', 'myValue');
    // const value = await store.get('myKey');
    // await store.del('myKey');
    
    return txRes.hash;
  } catch (error) {
    return error
  }
  
}
