const { Relayer } = require('defender-relay-client');
const axios = require('axios');
const Web3 = require('web3');
const web3 = new Web3("http://localhost:8545");

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE TO BE ADDED POST DEPLOYMENT */
const PRIVATE_KEY = "";
// const PROVIDER = "ws://localhost:8545";
const PROVIDER = "wss://mainnet.infura.io/ws/v3/6b7e574215f04cd3b9ec93f791a8b6c6";
const TXN_SIGNER = "6b7e574215f04cd3b9ec93f791a8b6c6";
//**************************************************************************************** */

// const web3 = new Web3(new Web3.providers.WebsocketProvider(PROVIDER));
const BN = web3.utils.BN;
// yieldster-defender-autotask/autotask/build/contracts/YieldsterVault.json
const yieldsterABI = require("../build/contracts/YieldsterVault.json").abi;
const strategyABI = require('../build/contracts/IStrategy.json').abi;
const priceModuleABI = require('../build/contracts/PriceModule.json').abi;
const IVaultABI = require('../build/contracts/IVault.json').abi;
const ERC20 = require('../build/contracts/ERC20Detailed.json').abi;
// const CRV3Pool = require("../build/contracts/curve3pool.json").abi;
// const minter = require("./build/contracts/LivaOneMinter.json").abi;
const safeConfig = require("./safeConfigs.json");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const priceModuleAddress = "0xFcA58c4DB195c2952350CB1F042975FCA1BC875b";

const etherscanAPIKey = "EPZKUNTQJSRTD1RTVHVIF6AWJF4FP3FJZY";

//**************************************************************************************** */
//**THE FOLLOWING CONFIGURATIONS ARE UNIQUE TO EACH SINGLE ASSET CRV STRATEGY */
const singleAssetStrategyMinter = "0x27f11E87a7492eA8d988EaA107311B38ff3DEE06";
const singleAssetStrategyAddress = "0x9777b0a97909326bC292e8f84BC3C59b7Cf12Ae2";
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

// req variables
let cvx = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
let cvxcrv = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";
let crv = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
let convexRewardContractAddress = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
let cvxCrvRewardContractAddress = "0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e";
let basepool_address = "0x4a2631d090e8b40bBDe245e687BF09e5e534A239";
let convexCrvABI = require("../build/contracts/ConvexCRV.json").abi;
// let ERC20 = require("./build/contracts/IERC20.json").abi;
let apContractABI = require("../build/contracts/APContract.json").abi;
let IRewardsABI = require("../build/contracts/IRewards.json").abi;
let ITokenMinterABI = require("../build/contracts/ITokenMinter.json").abi;
let minterdeployedaddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";

//   create contract instances
let ITokenMinterContract = new web3.eth.Contract(
    ITokenMinterABI,
    minterdeployedaddress
  );
  // THINGS TO ADD
  let cvx_cvxcrv_nav,cvx_basepool_nav;
  let Nav_total=new BN("0");
  // console.log(ITokenMinterContract);
  let apContract = new web3.eth.Contract(
    apContractABI,
    "0x5610984588631c59A3DF699b12404e20609026d9"
  );
  let strategyAddress = "0x9777b0a97909326bC292e8f84BC3C59b7Cf12Ae2";
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
  
  // other variables
  let NAV = new BN("0");
 
  let NAV1 = new BN("0");
  let NAV2 = new BN("0");
  let NAV3 = new BN("0");
  let NAV4 = new BN("0");
  
  // CRV CRV3 CVX are rewards from cvcxrv contract
  let crv_reward, cvxcrv_reward, CRV, CRV3, CVX;
  let NavEffective=new BN("0");
  // gettokenprices;
  let crv_USD, cvxcrv_USD, cvx_USD, crv3_USD, rewardToken;


const priceModule = new web3.eth.Contract(priceModuleABI, "0xc98435837175795d216547a8edc9e0472604bbda");

const BASE_URL = "https://api.yieldster.finance";
// gas check
const GasCheck = async () => {
    try {
      
        const enc= await web3.eth.abi.encodeFunctionSignature({
          name: 'harvest',
          type: 'function',
          inputs: [{
     
          }]
      })
 
      // console.log("encoded enc ",enc)
 
      estimatedgas=await web3.eth.estimateGas({
          to: "0xC9Ad669B000888f813499a18a7aEC412Da85B034",
          data: enc
      });
       console.log("estimated gas is",estimatedgas);    
     
    } catch (error) {
        console.log(`gas estimation error: ${error}`)
    }
 
  }
//   harvest check function
const  harvestCheck=async(NAV)=>{
    let Threshold=(5/100)*NAV;
      // console.log("Threshold" ,Threshold.toString())
      console.log("Threshold(5% Nav)" ,Threshold)
       await GasCheck();
      // console.log("after GasCheck")
    //   console.log("estimatedgas:",estimatedgas)
      let price =0.0003 ;
      let gascost=estimatedgas*price;
      console.log("gas price in USD",price);
      console.log("Gas cost",gascost);
      

      
      if(gascost<Threshold){
        await convexCrv.methods.harvest();
        console.log("harvest() called");
      }
      else{
        console.log("gas cost is higher than threshold,harvest not called");
      }
     
    
  }
//   set usd values funtion
const setUSDvalues = async () => {
    crv_USD = await apContract.methods.getUSDPrice(crv).call();
    cvxcrv_USD = await apContract.methods.getUSDPrice(crv).call();
    cvx_USD = await apContract.methods.getUSDPrice(cvx).call();
    crv3_USD = await apContract.methods.getUSDPrice(crv3).call();
  };
  const CalcBasepoolReward = async () => {
    crv_reward = await base_pool_contract.methods
      .earned(strategyAddress)
      .call();

    // TODO
    // MINT LOGIC
    
    cvx_basepool_nav=await mint(crv_reward);
    
    
    console.log("basepool cvx nav",cvx_basepool_nav);
    NAV1 =
      (new BN(crv_reward) / new BN((10 ** 18).toString())) *
      (new BN(crv_USD) / new BN((10 ** 18).toString()));
    // console.log("nav 1", NAV1.toString());
    // NavEffective+=new BN(new BN("NAV1").add(new BN("cvx_basepool_nav")))
  };

  const CalcCVXRewards = async () => {
    cvxcrv_reward = await convexRewardContract.methods
      .earned(strategyAddress)
      .call();
    // NAV += parseInt(
    //   (new BN(cvxcrv_reward) / new BN((10 ** 18).toString())) *
    //     (new BN(cvxcrv_USD) / new BN((10 ** 18).toString()))
    // );
    NAV2 =
      (new BN(cvxcrv_reward) / new BN((10 ** 18).toString())) *
      (new BN(cvxcrv_USD) / new BN((10 ** 18).toString()));
    // console.log("nav 2", NAV2.toString());
    // NavEffective+=new BN(new BN("NAV2").add(new BN("0")))
  };
  const CalcCVXcrv = async () => {
    CRV = await cvxCrvRewardContract.methods.earned(strategyAddress).call();
    //    extra reward calculation(3crv)
    let extraReward = await cvxCrvRewardContract.methods.extraRewards(0).call();
    let extraRewardContract = new web3.eth.Contract(IRewardsABI, extraReward);
    rewardToken = await extraRewardContract.methods.rewardToken().call();
    CRV3 = await extraRewardContract.methods.earned(strategyAddress).call();
    console.log("crv3",CRV3);
    // NAV += parseInt(
    //   (new BN(CRV3) / new BN((10 ** 18).toString())) *
    //     (new BN(crv3_USD) / new BN((10 ** 18).toString()))
    // );
    // NAV += parseInt(
    //   (new BN(CRV) / new BN((10 ** 18).toString())) *
    //     (new BN(crv_USD) / new BN((10 ** 18).toString()))
    // );
    NAV3 =
      (new BN(CRV3) / (new BN((10 ** 18).toString()))) *
      (new BN(crv3_USD) / new BN((10 ** 18).toString()));
      
    NAV4 =
      (new BN(CRV) / new BN((10 ** 18).toString())) *
      (new BN(crv_USD) / new BN((10 ** 18).toString()));
    // console.log("nav 3", NAV3.toString());
    // console.log("nav 4", NAV4.toString());
    // let Nav = new BN(new BN(NAV3).add(new BN(NAV4)));
    //  console.log("actural NAV is",Nav.toString())
    ////////////////////////////////////////////////////////////////////
   

    //  MINT LOGIC TO FIND OUT CVX
     cvx_cvxcrv_nav=await mint(CRV);
    // console.log("cvxcrv contract cvx nav",cvx_cvxcrv_nav);
    NavEffective+=new BN(new BN("NAV3").add(new BN("NAV4")).add(new BN("cvx_cvxcrv_nav")))
    // console.log("NavEffective",NavEffective)
    // FIND TOTAL NAV
    let num1 = new BN("15");
// console.log(typeof num1);
let NAV = new BN("1");
   let num = new BN(new BN(NAV).add(new BN("10")));
   
//    console.log(typeof(NAV1),typeof(NAV2),typeof(NAV3),typeof(NAV4),typeof(cvx_basepool_nav),typeof(cvx_cvxcrv_nav))
    console.log((NAV1),(NAV2),(NAV3),(NAV4),(cvx_basepool_nav),(cvx_cvxcrv_nav));
    Nav_total=new BN(new BN("NAV1").add(new BN("NAV2").add(new BN("NAV3").add(new BN("NAV4")).add(new BN("cvx_basepool_nav").add(new BN("cvx_cvxcrv_nav"))))))
     let Nav_total2=new BN(new BN("NAV1").add(new BN("NAV2").add(new BN("NAV3").add(new BN("NAV4")).add(new BN("cvx_basepool_nav").add(new BN("cvx_cvxcrv_nav"))))))
    // console.log("sum test",typeof(NAV1),typeof(new BN("NAV1")),NAV1,new BN("NAV").toString(),new BN(NAV).toString())
    // console.log("sum test2",(new BN("NAV2")).toString())
    // console.log("total NAV",Nav_total.toString());
    // console.log("total NAV",Nav_total2.toString());
    
  };
  const mint = async (crvAmount) => {
    try {
      let maxSupply = await ITokenMinterContract.methods.maxSupply().call();
  
      // console.log("maxsupply", maxSupply);
      let totalCliffs = await ITokenMinterContract.methods.totalCliffs().call();
      // console.log("totalCliffs===", totalCliffs);
  
      // let totalSupplyContract = new web3.eth.Contract(VaultStorageABI, crv)
      let supply = await ITokenMinterContract.methods.totalSupply().call();
      // console.log("type of supply", typeof supply);
      // console.log("total supplyyyyyy", supply);
      // console.log("type of max supplyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",typeof(totalCliffs));
      let reductionPerCliff = new BN(new BN(maxSupply)).div(new BN(totalCliffs));
      // console.log("reduction per clifff", typeof reductionPerCliff);
      //check value
      // console.log("reductionPerCliff", reductionPerCliff.toString());
  
      let cvxToBeMinted = crvAmount;
      // console.log("cvx ", cvxToBeMinted); // is initially required ?
  
      if (parseInt(supply) == 0) {
        console.log("entered supply==0 loop");
        cvxToBeMinted = crvAmount;
  
        // console.log("cvxToBeMinted=", cvxToBeMinted);
      }
      let cliff = new BN(new BN(supply)).div(new BN(reductionPerCliff));
      // console.log("cliff=", cliff.toString());
      // console.log(
      //   "types of cliff and total cliff ",
      //   typeof cliff,
      //   typeof totalCliffs
      // );
      if (parseInt(cliff.toString()) < parseInt(totalCliffs)) {
        console.log("entered the cliff < total cliff looop");
        reduction = totalCliffs - cliff;
        crvAmount = new BN(crvAmount);
        cvxToBeMinted = crvAmount.mul(new BN(reduction)).div(new BN(totalCliffs));
        // cvxToBeMinted = crvAmount*(reduction)/(totalCliffs);
        let cvx_amount = new BN(cvxToBeMinted).div(new BN((10 ** 18).toString()));
        // console.log("siuuuuuuuuuuuuuuuuuuuuuuuuuuuuu", typeof cvx_amount);
        // console.log("cvxToBeMinted=", cvxToBeMinted.toString());
  
        let amtTillMax = maxSupply.sub(supply);
        if (cvxToBeMinted > amtTillMax) {
          cvxToBeMinted = amtTillMax;
        }
      }
  
      // console.log("cvx To be minted=", cvxToBeMinted.toString());
      let cvxUSD = await apContract.methods.getUSDPrice(cvx).call();
      // console.log("cvxUSD=", cvxUSD);
  
      NAVofCVXminted = new BN(
        new BN(cvxToBeMinted.toString()).mul(new BN(cvxUSD.toString()))
      );
      let NAVofCVXmintedd = NAVofCVXminted.div(new BN((10 ** 18).toString()));
      let NAV_mint =
        (new BN(cvxToBeMinted) / new BN((10 ** 18).toString())) *
        (new BN(cvxUSD) / new BN((10 ** 18).toString()));
      // console.log("type of mint nav", typeof NAV_mint);
      //  console.log("mint nav", NAV_mint);
      return NAV_mint;
  
      // console.log("NAVofCVXmintedd=", NAVofCVXmintedd.toString())
      // console.log("NAVofCVXminted=", NAVofCVXminted.toString())
    } catch (error) {
      console.log(`error inside mint function ${error} ${error.length}`);
    }
  };






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
            from: "6b7e574215f04cd3b9ec93f791a8b6c6",
            data: data,
            gas:((new BN(gasCosts)).add(new BN('50000'))).toString()
        })
        return { status: true, message: "txn.hash" }
    } catch (error) {
        console.log(error)
        return { status: false, message: error }
    }
}


exports.handler = async (event) => {
    try {
        // const secrets = event.secrets;
        // if (event.request.hasOwnProperty('queryParameters')) {
        //     if (event.request.queryParameters.hasOwnProperty('vaultAddress')) {
        //         const vault = {
        //             "data": [
        //                 {
        //                     "depositableAssets": [
        //                         {
        //                             "assetAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        //                         }
        //                     ],
        //                     "withdrawableAssets": [
        //                         {
        //                             "assetAddress": "0xdac17f958d2ee523a2206206994597c13d831ec7"
        //                         }
        //                     ],
        //                     "vaultAddress": "0xcA55CAd7053FDbdC85Ae765Ae1FB76264b1239b0"
        //                 }
        //             ],
        //             "status": 1
        //         }      
        //     }
        // }
      await GasCheck()  
      await setUSDvalues()
      await CalcBasepoolReward();
      await CalcCVXRewards();
      await CalcCVXcrv();
      await GasCheck();
      let NavEff= (NAV1)+(NAV2)+(NAV3)+(NAV4)+(cvx_basepool_nav)+(cvx_cvxcrv_nav);
      await harvestCheck(NavEff);
      (NAV1)+(NAV2)+(NAV3)+(NAV4)+(cvx_basepool_nav)+(cvx_cvxcrv_nav);
      setTimeout(() => {
        console.log("effective Nav is",(NAV1)+(NAV2)+(NAV3)+(NAV4)+(cvx_basepool_nav)+(cvx_cvxcrv_nav));
      }, 100);
      
      return;


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
