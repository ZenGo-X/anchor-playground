# Anchor Playground

This repository is intended to give some basic interaction with anchor protocol.
I'll also try to give some explanation for everything we done in this program.

## Intro to Anchor
[Anchor](https://anchorprotocol.com/) is a savings protocol, backed by the [Terra](https://www.terra.money/) blockchain.
To be explicit, it is a set of smart contracts on the Terra blockchain providing the service of a decentralized savings and borrow solution. 
Much like other projects such as Compound and Maker, it allows the user to deposit some stable-coins. 
However, unlike Maker and Compound, it has some APY-stabilizing mechanisms. 
Be sure to read the [Anchor whitepaper](https://anchorprotocol.com/docs/anchor-v1.1.pdf) to fully understand how those mechanisms actually work. I'll try and give a glimpse of how it works.

### Anchor's APY Stabilization Mechanism
So in the savings mechanism typically there's a liquidity pool into which those who wish to gain some APY deposit some stablecoins.
We also consider the borrowers who wish to borrow from the pool for and pay some interest (knwon as APR) for their borrow.
The percentage from the pool which is borrowed and locked is known as the *utilization ratio*.
The APY and APR (annual percentage rate) both depend on the utilization value, so the utilization at some time `t` is `u(t)`.
Let's assume the `borrowRate` at time `t` (i.e. `borrowRate(t)`) is represented using some increasing function `f(u(t))` and the `depositRate` at time `t` (i.e `depositRate(t)`) is `u(t)*borrowRate(t)`, so the lower the utilization, the borrow rate is lower, to attract borrowers, and the greater the gap is between the borrow rate and deposit rate, to disincentivize additional deposit.

Borrowers can't just borrow money, however, they have to deposit some collateral against their borrow to ensure that those collaterals can be liquidated in case of a bankruptcy. The collaterals in Anchor are some PoS (proof of stake) assets which are staked while being collateralizaed, thus gaining some yields to the contracts which are split between borrowers and depositors as we will see later.

One problem with the existing mechanism is that it highly volatile with market trends. In a bull market, many people will borrow and returns will be high for the depositors. In a bear market nobody will borrow and returns will be miniscule. Thus, Anchor employs some stablization mechanisms as follows. 

Anchor does its best to ensure the APY (annual percentage yield) is kept stable and as close to some constant known as the *anchor rate (AR)*.
The value of this constant is determined by a moving average of the yields of the staked collaterals deposited by the borrowers in the past 12 months, so short-term disruptions will have small effect of this value.

So the while idea of the stabilization mechniams in Anchor is that splits the staking rewards so that whenever the `depositRate(t)` is smaller than `AR(t)` (the anchor rate at time `t`), a larger fraction of the staking yields will get to the depositors so `depositRate(t+1)` will be bigger and thus closer to the anchor rate.

There is a lot more to learn (how AR is computed, how liquidation of collaterals can be done etc...), but these are the basics.

### Depositor's Lifecycle
From the depositor's perspective, they have two possible actions they can initiate against Anchor.
1. Deposit some stablecoins.
2. Withdraw the deposited coins and the accured yield.

When depositing the stablecoins, the depositor receives as return an `aAsset`. For example, for depositing `UST` the depositor gets `aUST` tokens. 
Those represent an equal share in the pool of all deposits in the pool + all resources borrowed.

The `aAssets` are fungible and transferrable, which creates a secondary market for the depositors.
### Borrower's Perspective
From the borrower's perspective things are a little bit more complicated.

1. Mint a `bAsset`. 
To borrow, the first thing needs to be done to mint some `bAsset` against a PoS token. 
Currently Anchor only supports Eth-2.0 and Luna tokens as PoS assets against which, the `bEth` and `bLuna` tokens can be minted. 
When doing so the user also specifies an address of a validator to which his colleteral will be deposited. 
There are only a small set of whitelisted validators which can be used in Anchor due to the risk of slashing. 
The `bAssets` are (in theory) 1:1 pegged with the underlying PoS assets, so against 1 Luna we mint 1 bLuna, though this is not always the case due to the possibility of slashing. 
To prevent the ratio from decaying too much, a small fee is applied (if necessary) when minting and burning bAssets to compensate for previous slashings.
The minted `bAssets` are also fungible and transferrable which creates a secodary market for them too.
2. Collateralize the `bAsset`. By that moving the `bAsset` to the ownership of the contract.
3. Borrowing stablecoins. After having some assets collateralized, stablecoins can be borrowed.
4. Repay loan.
5. Withdraw collaterals.
6. burn `bAsset`. The burning can be either instant or non-instant. The instant burning is done by swapping the `bAsset` on a Terra-powered DeFi platform, by that utilizing the secondary market of the `bAssets` (the asset doesn't really gets burnt!). Non-instant burning (true burning) takes up to 24 days to ensure funds are available.

There are additional actions that can be done, but these are the most basic ones.

### Anchor Risks
The slashing is one of the major risks for borrowers mostly. 
For depositors the main risk is malfunctioning of the liquidation market in which the collaterals of the bankrupt borrower are sold at a discount. If there are not many bids in the market, the collaterals can be sold at a too-low price and the depositors will have fewer UST to deposited against their `aUST` tokens.

## Using the playground
The playground has a Terra **testnet** wallet (address: `terra15aslj5rud7emhhnxp860d57h9re5328mvxyf39`) which is preloaded with testnet Luna and some testnet UST. 
If you need some additional coins just use the [terra facut](https://faucet.terra.money/). 
The tool enables the user to make basic interactions with the Anchor protocol.

Prerequisite:
- `yarn` and `node` should be installed.

Usage:
- To use the anchor wallet use the `yarn app <command> [arguments]` command from your shell. 
- You can also always use `yarn app --help` to display a help message.
We will be maintaining a wallet, preloaded with some Luna and UST coins.