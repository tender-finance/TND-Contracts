const { deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")
const {expandDecimals} = require("../../test/shared/utilities");

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('../core/tokens')[network];

async function main() {
  // const config
  const bnMultiplierToDistributor = 10000                                     // 100% in years
  const esTndToDistributer = expandDecimals(50000 * 12, 18)        // ~50,000 esTnd per month
  const esTndPerIntervalToDistributor = "20667989410000000"                   // 0.02066798941 esTnd per second
  const bnTndToDistributor = expandDecimals(15 * 1000 * 1000, 18)  // 15 million
  const feeTndPerIntervalToDistributor = "413359700000"                       // 1 / (28 * 24 * 60 * 60) = 0.0000004133597 ETH per second

  const { nativeToken } = tokens
  const wallet = await ethers.getSigner();

  const vestingDuration = 365 * 24 * 60 * 60

  // Tnd tokens
  const tnd = await contractAt("TND", "0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C");
  const esTnd = await deployContract("EsTND", []);
  const bnTnd = await deployContract("MintableBaseToken", ["Bonus TND", "bnTND", 0]);

  // StakeTndTracker
  const stakedTndTracker = await deployContract("RewardTracker", ["Staked TND", "sTND"])
  const stakedTndDistributor = await deployContract("RewardDistributor", [esTnd.address, stakedTndTracker.address])
  await sendTxn(stakedTndTracker.initialize([tnd.address, esTnd.address], stakedTndDistributor.address), "stakedTndTracker.initialize")
  await sendTxn(stakedTndDistributor.updateLastDistributionTime(), "stakedTndDistributor.updateLastDistributionTime")

  // BonusTndTracker
  const bonusTndTracker = await deployContract("RewardTracker", ["Staked + Bonus TND", "sbTND"])
  const bonusTndDistributor = await deployContract("BonusDistributor", [bnTnd.address, bonusTndTracker.address])
  await sendTxn(bonusTndTracker.initialize([stakedTndTracker.address], bonusTndDistributor.address), "bonusTndTracker.initialize")
  await sendTxn(bonusTndDistributor.updateLastDistributionTime(), "bonusTndDistributor.updateLastDistributionTime")

  // FeeTndTracker
  const feeTndTracker = await deployContract("RewardTracker", ["Staked + Bonus + Fee TND", "sbfTND"])
  const feeTndDistributor = await deployContract("RewardDistributor", [nativeToken.address, feeTndTracker.address])
  await sendTxn(feeTndTracker.initialize([bonusTndTracker.address, bnTnd.address], feeTndDistributor.address), "feeTndTracker.initialize")
  await sendTxn(feeTndDistributor.updateLastDistributionTime(), "feeTndDistributor.updateLastDistributionTime")

  // Vester
  const tndVester = await deployContract("Vester", [
    "Vested TND",             // _name
    "vTND",                   // _symbol
    vestingDuration,          // _vestingDuration
    esTnd.address,            // _esToken
    feeTndTracker.address,    // _pairToken
    tnd.address,              // _claimableToken
    stakedTndTracker.address, // _rewardTracker
  ])

  // Router
  const rewardRouter = await deployContract("RewardRouterV2", [])
  await sendTxn(rewardRouter.initialize(
    nativeToken.address,
    tnd.address,
    esTnd.address,
    bnTnd.address,
    stakedTndTracker.address,
    bonusTndTracker.address,
    feeTndTracker.address,
    tndVester.address,
  ), "rewardRouter.initialize")

  // Set private
  await sendTxn(esTnd.setInPrivateTransferMode(true), "esTnd.setInPrivateTransferMode")
  await sendTxn(stakedTndTracker.setInPrivateTransferMode(true), "stakedTndTracker.setInPrivateTransferMode")
  await sendTxn(stakedTndTracker.setInPrivateStakingMode(true), "stakedTndTracker.setInPrivateStakingMode")
  await sendTxn(bonusTndTracker.setInPrivateTransferMode(true), "bonusTndTracker.setInPrivateTransferMode")
  await sendTxn(bonusTndTracker.setInPrivateStakingMode(true), "bonusTndTracker.setInPrivateStakingMode")
  await sendTxn(bonusTndTracker.setInPrivateClaimingMode(true), "bonusTndTracker.setInPrivateClaimingMode")
  await sendTxn(feeTndTracker.setInPrivateTransferMode(true), "feeTndTracker.setInPrivateTransferMode")
  await sendTxn(feeTndTracker.setInPrivateStakingMode(true), "feeTndTracker.setInPrivateStakingMode")

  // Set handler and minter
  await sendTxn(stakedTndTracker.setHandler(rewardRouter.address, true), "stakedTndTracker.setHandler(rewardRouter)")
  await sendTxn(stakedTndTracker.setHandler(bonusTndTracker.address, true), "stakedTndTracker.setHandler(bonusTndTracker)")

  await sendTxn(bonusTndTracker.setHandler(rewardRouter.address, true), "bonusTndTracker.setHandler(rewardRouter)")
  await sendTxn(bonusTndTracker.setHandler(feeTndTracker.address, true), "bonusTndTracker.setHandler(feeTndTracker)")
  await sendTxn(bonusTndDistributor.setBonusMultiplier(bnMultiplierToDistributor), "bonusTndDistributor.setBonusMultiplier")

  await sendTxn(feeTndTracker.setHandler(rewardRouter.address, true), "feeTndTracker.setHandler(rewardRouter)")
  await sendTxn(feeTndTracker.setHandler(tndVester.address, true), "feeTndTracker.setHandler(tndVester)")

  await sendTxn(esTnd.setHandler(rewardRouter.address, true), "esTnd.setHandler(rewardRouter)")
  await sendTxn(esTnd.setHandler(stakedTndTracker.address, true), "esTnd.setHandler(stakedTndTracker)")
  await sendTxn(esTnd.setHandler(stakedTndDistributor.address, true), "esTnd.setHandler(stakedTndDistributor)")
  await sendTxn(esTnd.setHandler(tndVester.address, true), "esTnd.setHandler(tndVester)")
  await sendTxn(esTnd.setMinter(tndVester.address, true), "esTnd.setMinter(tndVester)")

  await sendTxn(bnTnd.setHandler(feeTndTracker.address, true), "bnTnd.setHandler(feeTndTracker")
  await sendTxn(bnTnd.setMinter(rewardRouter.address, true), "bnTnd.setMinter(rewardRouter")

  await sendTxn(tndVester.setHandler(rewardRouter.address, true), "tndVester.setHandler(rewardRouter)")

  // mint esTnd for distributors
  await sendTxn(esTnd.setMinter(wallet.address, true), "esTnd.setMinter(wallet)")
  await sendTxn(esTnd.mint(stakedTndDistributor.address, esTndToDistributer), "esTnd.mint(stakedGmxDistributor")
  await sendTxn(esTnd.setMinter(wallet.address, false), "esTnd.setMinter(wallet)")

  await sendTxn(stakedTndDistributor.setTokensPerInterval(esTndPerIntervalToDistributor), "stakedTndDistributor.setTokensPerInterval")

  // mint bnTnd for distributor
  await sendTxn(bnTnd.setMinter(wallet.address, true), "bnTnd.setMinter")
  await sendTxn(bnTnd.mint(bonusTndDistributor.address, bnTndToDistributor), "bnTnd.mint(bonusTndDistributor)")
  await sendTxn(bnTnd.setMinter(wallet.address, false), "bnTnd.setMinter")

  await sendTxn(feeTndDistributor.setTokensPerInterval(feeTndPerIntervalToDistributor), "feeTndDistributor.setTokensPerInterval")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
