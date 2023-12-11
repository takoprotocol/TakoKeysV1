# TakoKeysV1: Tradable Shares and Fee Management on Ethereum

## Features

* Creator Shares Issuance: Creators can issue shares at an initial DEX Offering price and specify parameters for a piecewise pricing curve.
* Buy and Sell Shares: Users can purchase shares at the current buy price and sell them back at the current sell price, which are determined based on a piecewise function that transitions from a constant price to a curve.
* Fee Management: The platform collects fees on both buy and sell transactions, with separate fee percentages for protocol and creators, and ensures transparent distribution.

## Contract Details

### Immutable Variables
* farcasterKey: 
* farcasterHub:

### State Variables
* isOpenInit
* protocolFeeDestination
* protocolBuyFeePercent
* protocolSellFeePercent
* creatorBuyFeePercent
* creatorSellFeePercent
* sharesSupply
* userClaimable
* pooInfo

### Events

* SetFeeTo
* SetProtocolBuyFee
* SetProtocolSellFee
* setCreatorBuyFee
* setCreatorSellFee
* setOpenInit
* TradeEvent
* CreateShares
* ClaimEvent

### Functions Overview

* setFeeDestination: Sets the destination address for protocol fees.
* setProtocolBuyFeePercent: Sets the buy fee percentage for the protocol
* setProtocolSellFeePercent: Sets the sell fee percentage for the protocol
* setCreatorBuyFeePercent: Sets the buy fee percentage for the protocol
* setCreatorSellFeePercent: Sets the sell fee percentage for the creator.
* setOpenInit: Opens oc closes the platform for shares issuance.
* getBuyPrice: Retrieves the price for buying shares.
* getSellPrice: Retrieves the price for selling shares.
* createSharesForPiecewise: Allows a creator to issue shares with a piecewise pricing model.
* buyShares: Allows a user to buy shares.
* sellShare: Allows a user to sell a single share.
* sellShares: Allows a user to sell multiple shares.
* claim: Allows a user to claim accumulated fees.

### Deployment and Usage

The following content will explain the data transformation from user input on the front end to contract input parameters:

When users create a Keys trading pool on the front end, the input parameters are:
InitialSupply, TotalSupply, StartPrice, HighestPrice
The input parameters for creating a Keys trading pool in the contract are:
```
uint256 creatorId, 
uint256 startPrice, 
uint256 initialSupply, 
uint256 totalSupply, 
uint256 a, 
uint256 b, 
uint256 k
```
The precision of the parameters a, b, k is 8. For example, if you want to input 1.55 as the parameter a, then a should be set as 1.55 * 10**8 = 155000000.
Here, creatorId corresponds to the Fid associated with the user's address,
startPrice corresponds to StartPrice, initialSupply corresponds to the InitialSupply input on the front end, and totalSupply corresponds to TotalSupply.

For a, b, k, we can consider the formula as:
$$
f(x) = ax^2 + bx + k
$$
In the front-end environment, we default the input value of b to 0,
$$
f(x) = ax^2 + k
$$
Here, the values of a and k are computed given the InitialSupply, TotalSupply, StartPrice, HighestPrice

Let y1 = HighestPrice, y2 = StartPrice, X1 = TotalSupply, x2 = InitialSupply
Then
$$
a = (y1 - y2) / (x1^2 - x2^2)
$$
For a, we round up to get a'

At this point
$$
k = y1 - a' * x1^2
$$
For k, we round down to get k'

In the contract input, a corresponds to a', k corresponds to k', and b is taken as 0.

### Disclaimer
This contract is provided "as is" without any warranty of any kind, either express or implied. Users are responsible for conducting their own due diligence and seeking professional advice if necessary before interacting with the contract on the blockchain.

### license
This contract is licensed under the AGPL-3.0 license. Please ensure compliance with all terms and conditions of the license when using or modifying this contract.

Try running some of the following tasks:

### Contract Address

Contract: 0xdBD62fdd13719417189DA2C7E2f8064dCDC0Ac20

NFT: 0x106484C61F2893C134E8E801C468E5A448ed150f

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts --network optimism
npx hardhat run scripts/deploy.ts --network optestnet
```
