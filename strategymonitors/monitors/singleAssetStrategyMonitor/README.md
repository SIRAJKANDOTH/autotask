## Handler Function
The starting point. Takes in api req, if query params, then the monitor runs only for that particular vault.

## Handle Vault function
The sub function to the handler, call the functions to calculate the amount to invest and the function to decide if strategy investment has to be done (Earn function).

## Earn function
This function will create the encoded instructions to be sent to the relayer.It takes in the details of the vault from the handle vault function.

## assetProportions function
1. Every curve pool based investment strategy , be it based on yearn or convex will have an underlying curve finance. based liquidity pool as a part of it. 

2. The nature of these curve liquidity pools is that they usually will be of the form of 3CRV + **ANY BASE ASSET**. This base asset can be Tokens such as USDN, USDP, USDK. How these tokens are selected is not relevant to us.
3. 3CRV is the Liquidity pool token of 3Pool, which is a specialized liquidity pool of curve finance. This particular pool will accept DAI , USDC and USDT .
4. Coming back to the function, the function will take  assetArr and amountToInvest as parameters . As the name suggests ,assetArr will be a list of assets in the vault, and amountToInvest will be the NAV of the amount to be invested in the strategy.
5. The function will return 3 Mappings.
    1. assetsMapping :- A mapping of all the assets and their balances.
    2. baseAssetsMapping :- A mapping of the 3 Pool base assets (DAI, USDC, USDT)
    3. nonBaseAssetsMapping :- A mapping of the non 3 Pool base assets. 
