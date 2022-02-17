const { Relayer } = require("defender-relay-client");
const axios = require("axios");
const Web3 = require("web3");
const web3 = new Web3("http://localhost:8545");
require('dotenv').config({path:"./../../.env"})



//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE TO BE ADDED POST DEPLOYMENT */
const PRIVATE_KEY = "";
// const PROVIDER = "ws://localhost:8545";
const PROVIDER =process.env.PROVIDER;
  
const TXN_SIGNER = process.env.TXN_SIGNER;
//**************************************************************************************** */

const BN = web3.utils.BN;
const yieldsterABI = require("../build/contracts/YieldsterVault.json").abi;
const strategyABI = require("../build/contracts/IStrategy.json").abi;
const priceModuleABI = require("../build/contracts/PriceModule.json").abi;
const IVaultABI = require("../build/contracts/IVault.json").abi;
const ERC20 = require("../build/contracts/ERC20Detailed.json").abi;
const safeConfig = require("./safeConfigs.json");
let strategyAddress;


// req variables
let cvx = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
let cvxcrv = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";
let crv = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
let convexRewardContractAddress = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
let cvxCrvRewardContractAddress = "0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e";
let basepool_address = "0x4a2631d090e8b40bBDe245e687BF09e5e534A239";
let convexCrvABI = require("../build/contracts/ConvexCRV.json").abi;
let apContractABI = require("../build/contracts/APContract.json").abi;
let IRewardsABI = require("../build/contracts/IRewards.json").abi;
let ITokenMinterABI = require("../build/contracts/ITokenMinter.json").abi;
let minterdeployedaddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";

let ITokenMinterContract = new web3.eth.Contract(
  ITokenMinterABI,
  minterdeployedaddress
);
// THINGS TO ADD
let cvx_cvxcrv_nav, cvx_basepool_nav;

let apContract = new web3.eth.Contract(
  apContractABI,
  "0x984F84520495f499Fa67E3316CA8CfffBB87f54E"
);
 
let convexCrv = new web3.eth.Contract(convexCrvABI, strategyAddress);
let convexRewardContract = new web3.eth.Contract(
  IRewardsABI,
  convexRewardContractAddress
);
let cvxCrvRewardContract = new web3.eth.Contract(
  IRewardsABI,
  cvxCrvRewardContractAddress
);
let base_pool_contract = new web3.eth.Contract(IRewardsABI, basepool_address);



let NAV1 = new BN("0");
let NAV2 = new BN("0");
let NAV3 = new BN("0");
let NAV4 = new BN("0");
let estimatedgas,VaultAddres, StratagyAdress;

let crv_reward, cvxcrv_reward, CRV, CRV3, CVX;
let NavEffective = new BN("0");
let crv_USD, cvxcrv_USD, cvx_USD, crv3_USD, rewardToken;

const BASE_URL = "https://api.yieldster.finance";
// gas check
const GasCheck = async () => {
  try {
    const enc = await web3.eth.abi.encodeFunctionSignature({
      name: "harvest",
      type: "function",
      inputs: [{}],
    });

    estimatedgas = await web3.eth.estimateGas({
      to: "0xC9Ad669B000888f813499a18a7aEC412Da85B034",
      data: enc,
    });
    console.log("estimated gas is", estimatedgas);
  } catch (error) {
    console.log(`gas estimation error: ${error}`);
  }
};
const harvestCheck = async (NAV, secrets) => {
  let Threshold = (5 / 100) * NAV;
  // (totalNAVEarned.mul(new BN('5')).div(new BN('100'))).gt(gasUsedInUSD)
  console.log("Threshold(5% Nav)", Threshold);

  let price = 0.0003;
  let gascost = estimatedgas * price;
  console.log("gas price in USD", price);
  console.log("Gas cost", gascost);

  if (gascost < Threshold) {
    const enc1 = await web3.eth.abi.encodeFunctionCall(
      {
        name: "harvest",
        type: "function",
        inputs: [],
      },
      []
    );
    let txn = await sendTransaction(enc1, secrets, estimatedgas);
    return { status: txn.status, response: txn.message };

    console.log("harvest() called");
  } else {
    console.log("gas cost is higher than threshold,harvest not called");
  }
};
//   set usd values funtion
const setUSDvalues = async () => {
  crv_USD = await apContract.methods.getUSDPrice(crv).call();
  cvxcrv_USD = await apContract.methods.getUSDPrice(crv).call();
  cvx_USD = await apContract.methods.getUSDPrice(cvx).call();
  crv3_USD = await apContract.methods.getUSDPrice(crv3).call();
};
const CalcBasepoolReward = async (strategyAddress) => {
  crv_reward = await base_pool_contract.methods.earned(strategyAddress).call();

  cvx_basepool_nav = await mint(crv_reward);

  console.log("basepool cvx nav", cvx_basepool_nav);
  NAV1 =
    (new BN(crv_reward) / new BN((10 ** 18).toString())) *
    (new BN(crv_USD) / new BN((10 ** 18).toString()));
};

const CalcCVXRewards = async (strategyAddress) => {
  cvxcrv_reward = await convexRewardContract.methods
    .earned(strategyAddress)
    .call();

  NAV2 =
    (new BN(cvxcrv_reward) / new BN((10 ** 18).toString())) *
    (new BN(cvxcrv_USD) / new BN((10 ** 18).toString()));
};
const CalcCVXcrv = async (strategyAddress) => {
  CRV = await cvxCrvRewardContract.methods.earned(strategyAddress).call();
  let extraReward = await cvxCrvRewardContract.methods.extraRewards(0).call();
  let extraRewardContract = new web3.eth.Contract(IRewardsABI, extraReward);
  rewardToken = await extraRewardContract.methods.rewardToken().call();
  CRV3 = await extraRewardContract.methods.earned(strategyAddress).call();
  console.log("crv3", CRV3);

  NAV3 =
    (new BN(CRV3) / new BN((10 ** 18).toString())) *
    (new BN(crv3_USD) / new BN((10 ** 18).toString()));

  NAV4 =
    (new BN(CRV) / new BN((10 ** 18).toString())) *
    (new BN(crv_USD) / new BN((10 ** 18).toString()));

  cvx_cvxcrv_nav = await mint(CRV);
  NavEffective += new BN(
    new BN("NAV3").add(new BN("NAV4")).add(new BN("cvx_cvxcrv_nav"))
  );

  let num1 = new BN("15");
  let NAV = new BN("1");
  let num = new BN(new BN(NAV).add(new BN("10")));

  console.log(NAV1, NAV2, NAV3, NAV4, cvx_basepool_nav, cvx_cvxcrv_nav);
  Nav_total = new BN(
    new BN("NAV1").add(
      new BN("NAV2").add(
        new BN("NAV3")
          .add(new BN("NAV4"))
          .add(new BN("cvx_basepool_nav").add(new BN("cvx_cvxcrv_nav")))
      )
    )
  );
  let Nav_total2 = new BN(
    new BN("NAV1").add(
      new BN("NAV2").add(
        new BN("NAV3")
          .add(new BN("NAV4"))
          .add(new BN("cvx_basepool_nav").add(new BN("cvx_cvxcrv_nav")))
      )
    )
  );
};
const mint = async (crvAmount) => {
  try {
    let maxSupply = await ITokenMinterContract.methods.maxSupply().call();

    let totalCliffs = await ITokenMinterContract.methods.totalCliffs().call();

    let supply = await ITokenMinterContract.methods.totalSupply().call();

    let reductionPerCliff = new BN(new BN(maxSupply)).div(new BN(totalCliffs));

    let cvxToBeMinted = crvAmount;

    if (parseInt(supply) == 0) {
      console.log("entered supply==0 loop");
      cvxToBeMinted = crvAmount;
    }
    let cliff = new BN(new BN(supply)).div(new BN(reductionPerCliff));

    if (parseInt(cliff.toString()) < parseInt(totalCliffs)) {
      console.log("entered the cliff < total cliff looop");
      reduction = totalCliffs - cliff;
      crvAmount = new BN(crvAmount);
      cvxToBeMinted = crvAmount.mul(new BN(reduction)).div(new BN(totalCliffs));
      let cvx_amount = new BN(cvxToBeMinted).div(new BN((10 ** 18).toString()));
      let amtTillMax = maxSupply.sub(supply);
      if (cvxToBeMinted > amtTillMax) {
        cvxToBeMinted = amtTillMax;
      }
    }

    let cvxUSD = await apContract.methods.getUSDPrice(cvx).call();

    NAVofCVXminted = new BN(
      new BN(cvxToBeMinted.toString()).mul(new BN(cvxUSD.toString()))
    );
    let NAVofCVXmintedd = NAVofCVXminted.div(new BN((10 ** 18).toString()));
    let NAV_mint =
      (new BN(cvxToBeMinted) / new BN((10 ** 18).toString())) *
      (new BN(cvxUSD) / new BN((10 ** 18).toString()));

    return NAV_mint;
  } catch (error) {
    console.log(`error inside mint function ${error} ${error.length}`);
  }
};

const sendTransaction = async (data, secrets, gasCosts) => {
  try {
    let privateKey =
      "0x7a23790bf15fac7707c9e1016b50d5258b29ddbb81e59215080e18af8fc0c8e1";
    if (secrets.hasOwnProperty("MAINNET_ACTUAL"))
      privateKey = secrets.MAINNET_ACTUAL;
    else privateKey = PRIVATE_KEY;
    let acc = web3.eth.accounts.privateKeyToAccount(privateKey);
    let wallet = web3.eth.accounts.wallet.add(acc);

    const txn = await web3.eth.sendTransaction({
      to: strategyAddress,
      from: "0xb2AA4a5DF3641D42e72D7F07a40292794dfD07a0",
      data: data,
      gas: new BN(gasCosts).add(new BN("50000")).toString(),
    });
    return { status: true, message: "txn.hash" };
  } catch (error) {
    console.log(error);
    return { status: false, message: error };
  }
};
const handleVault = async (vault, secrets) => {
  console.log("handle vault called");
  let vaultAddr = vault.data[0].vaultAddress;
  console.log(`Vault Address :- `, vaultAddr);
  const yieldsterContractInstance = new web3.eth.Contract(
    yieldsterABI,
    vaultAddr
  );

  let vaultActiveStrategy = await yieldsterContractInstance.methods
    .getVaultActiveStrategy()
    .call();
  strategyAddress = vaultActiveStrategy[0];
  await GasCheck();
  await setUSDvalues();
  await CalcBasepoolReward(strategyAddress);
  await CalcCVXRewards(strategyAddress);
  await CalcCVXcrv(strategyAddress);
  let NavEff = NAV1 + NAV2 + NAV3 + NAV4 + cvx_basepool_nav + cvx_cvxcrv_nav;
  await harvestCheck(200, secrets);
  NAV1 + NAV2 + NAV3 + NAV4 + cvx_basepool_nav + cvx_cvxcrv_nav;
  setTimeout(() => {
    console.log(
      "effective Nav is",
      NAV1 + NAV2 + NAV3 + NAV4 + cvx_basepool_nav + cvx_cvxcrv_nav
    );
  }, 100);
};

exports.handler = async (event) => {
  try {
    const secrets = event.secrets;
    if (event.request.hasOwnProperty("queryParameters")) {
      if (event.request.queryParameters.hasOwnProperty("vaultAddress")) {
        console.log(" enterd this loop", event.request.queryParameters);
        const vault = {
          data: [
            {
              depositableAssets: [
                { assetAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
              ],
              withdrawableAssets: [
                { assetAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
              ],
              vaultAddress: "0xcA55CAd7053FDbdC85Ae765Ae1FB76264b1239b0",
            },
          ],
          status: 1,
        };
        console.log("this thing ", vault);
        console.log("vault address", vault.data[0].vaultAddress);
        VaultAddres = vault.data[0].vaultAddress;
        if (vault.status && vault.data) {
          let res = await handleVault(vault, secrets);
          return res;
        } else return { status: "false", message: "nil" };
      }
    }
    return;
  } catch (error) {
    console.log(error);
    return { status: "false", message: error.message };
  }
};

exports.handler({
  request: {
    queryParameters: {
      vaultAddress: "0xcA55CAd7053FDbdC85Ae765Ae1FB76264b1239b0",
    },
  },
  secrets: {
    MAINNET_ACTUAL:
      "0x7a23790bf15fac7707c9e1016b50d5258b29ddbb81e59215080e18af8fc0c8e1",
  },
});
