const { deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")
const {expandDecimals} = require("../../test/shared/utilities");

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('../core/tokens')[network];

// async function main() {
//   const { nativeToken } = tokens
//
//   console.log(tokens)
//   const vestingDuration = 365 * 24 * 60 * 60
//
//   const glpManager = await contractAt("GlpManager", "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F")
//   const glp = await contractAt("GLP", "0x01234181085565ed162a948b6a5e88758CD7c7b8")
//
//   const gmx = await contractAt("GMX", "0x62edc0692BD897D2295872a9FFCac5425011c661");
//   const esGmx = await contractAt("EsGMX", "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17");
//   const bnGmx = await deployContract("MintableBaseToken", ["Bonus GMX", "bnGMX", 0]);
//
//   await sendTxn(esGmx.setInPrivateTransferMode(true), "esGmx.setInPrivateTransferMode")
//   await sendTxn(glp.setInPrivateTransferMode(true), "glp.setInPrivateTransferMode")
//
//   const stakedGmxTracker = await deployContract("RewardTracker", ["Staked GMX", "sGMX"])
//   const stakedGmxDistributor = await deployContract("RewardDistributor", [esGmx.address, stakedGmxTracker.address])
//   await sendTxn(stakedGmxTracker.initialize([gmx.address, esGmx.address], stakedGmxDistributor.address), "stakedGmxTracker.initialize")
//   await sendTxn(stakedGmxDistributor.updateLastDistributionTime(), "stakedGmxDistributor.updateLastDistributionTime")
//
//   const bonusGmxTracker = await deployContract("RewardTracker", ["Staked + Bonus GMX", "sbGMX"])
//   const bonusGmxDistributor = await deployContract("BonusDistributor", [bnGmx.address, bonusGmxTracker.address])
//   await sendTxn(bonusGmxTracker.initialize([stakedGmxTracker.address], bonusGmxDistributor.address), "bonusGmxTracker.initialize")
//   await sendTxn(bonusGmxDistributor.updateLastDistributionTime(), "bonusGmxDistributor.updateLastDistributionTime")
//
//   const feeGmxTracker = await deployContract("RewardTracker", ["Staked + Bonus + Fee GMX", "sbfGMX"])
//   const feeGmxDistributor = await deployContract("RewardDistributor", [nativeToken.address, feeGmxTracker.address])
//   await sendTxn(feeGmxTracker.initialize([bonusGmxTracker.address, bnGmx.address], feeGmxDistributor.address), "feeGmxTracker.initialize")
//   await sendTxn(feeGmxDistributor.updateLastDistributionTime(), "feeGmxDistributor.updateLastDistributionTime")
//
//   const feeGlpTracker = await deployContract("RewardTracker", ["Fee GLP", "fGLP"])
//   const feeGlpDistributor = await deployContract("RewardDistributor", [nativeToken.address, feeGlpTracker.address])
//   await sendTxn(feeGlpTracker.initialize([glp.address], feeGlpDistributor.address), "feeGlpTracker.initialize")
//   await sendTxn(feeGlpDistributor.updateLastDistributionTime(), "feeGlpDistributor.updateLastDistributionTime")
//
//   const stakedGlpTracker = await deployContract("RewardTracker", ["Fee + Staked GLP", "fsGLP"])
//   const stakedGlpDistributor = await deployContract("RewardDistributor", [esGmx.address, stakedGlpTracker.address])
//   await sendTxn(stakedGlpTracker.initialize([feeGlpTracker.address], stakedGlpDistributor.address), "stakedGlpTracker.initialize")
//   await sendTxn(stakedGlpDistributor.updateLastDistributionTime(), "stakedGlpDistributor.updateLastDistributionTime")
//
//   await sendTxn(stakedGmxTracker.setInPrivateTransferMode(true), "stakedGmxTracker.setInPrivateTransferMode")
//   await sendTxn(stakedGmxTracker.setInPrivateStakingMode(true), "stakedGmxTracker.setInPrivateStakingMode")
//   await sendTxn(bonusGmxTracker.setInPrivateTransferMode(true), "bonusGmxTracker.setInPrivateTransferMode")
//   await sendTxn(bonusGmxTracker.setInPrivateStakingMode(true), "bonusGmxTracker.setInPrivateStakingMode")
//   await sendTxn(bonusGmxTracker.setInPrivateClaimingMode(true), "bonusGmxTracker.setInPrivateClaimingMode")
//   await sendTxn(feeGmxTracker.setInPrivateTransferMode(true), "feeGmxTracker.setInPrivateTransferMode")
//   await sendTxn(feeGmxTracker.setInPrivateStakingMode(true), "feeGmxTracker.setInPrivateStakingMode")
//
//   await sendTxn(feeGlpTracker.setInPrivateTransferMode(true), "feeGlpTracker.setInPrivateTransferMode")
//   await sendTxn(feeGlpTracker.setInPrivateStakingMode(true), "feeGlpTracker.setInPrivateStakingMode")
//   await sendTxn(stakedGlpTracker.setInPrivateTransferMode(true), "stakedGlpTracker.setInPrivateTransferMode")
//   await sendTxn(stakedGlpTracker.setInPrivateStakingMode(true), "stakedGlpTracker.setInPrivateStakingMode")
//
//   const gmxVester = await deployContract("Vester", [
//     "Vested GMX", // _name
//     "vGMX", // _symbol
//     vestingDuration, // _vestingDuration
//     esGmx.address, // _esToken
//     feeGmxTracker.address, // _pairToken
//     gmx.address, // _claimableToken
//     stakedGmxTracker.address, // _rewardTracker
//   ])
//
//   const glpVester = await deployContract("Vester", [
//     "Vested GLP", // _name
//     "vGLP", // _symbol
//     vestingDuration, // _vestingDuration
//     esGmx.address, // _esToken
//     stakedGlpTracker.address, // _pairToken
//     gmx.address, // _claimableToken
//     stakedGlpTracker.address, // _rewardTracker
//   ])
//
//   const rewardRouter = await deployContract("RewardRouterV2", [])
//   await sendTxn(rewardRouter.initialize(
//     nativeToken.address,
//     gmx.address,
//     esGmx.address,
//     bnGmx.address,
//     glp.address,
//     stakedGmxTracker.address,
//     bonusGmxTracker.address,
//     feeGmxTracker.address,
//     feeGlpTracker.address,
//     stakedGlpTracker.address,
//     glpManager.address,
//     gmxVester.address,
//     glpVester.address
//   ), "rewardRouter.initialize")
//
//   await sendTxn(glpManager.setHandler(rewardRouter.address), "glpManager.setHandler(rewardRouter)")
//
//   // allow rewardRouter to stake in stakedGmxTracker
//   await sendTxn(stakedGmxTracker.setHandler(rewardRouter.address, true), "stakedGmxTracker.setHandler(rewardRouter)")
//   // allow bonusGmxTracker to stake stakedGmxTracker
//   await sendTxn(stakedGmxTracker.setHandler(bonusGmxTracker.address, true), "stakedGmxTracker.setHandler(bonusGmxTracker)")
//   // allow rewardRouter to stake in bonusGmxTracker
//   await sendTxn(bonusGmxTracker.setHandler(rewardRouter.address, true), "bonusGmxTracker.setHandler(rewardRouter)")
//   // allow bonusGmxTracker to stake feeGmxTracker
//   await sendTxn(bonusGmxTracker.setHandler(feeGmxTracker.address, true), "bonusGmxTracker.setHandler(feeGmxTracker)")
//   await sendTxn(bonusGmxDistributor.setBonusMultiplier(10000), "bonusGmxDistributor.setBonusMultiplier")
//   // allow rewardRouter to stake in feeGmxTracker
//   await sendTxn(feeGmxTracker.setHandler(rewardRouter.address, true), "feeGmxTracker.setHandler(rewardRouter)")
//   // allow stakedGmxTracker to stake esGmx
//   await sendTxn(esGmx.setHandler(stakedGmxTracker.address, true), "esGmx.setHandler(stakedGmxTracker)")
//   // allow feeGmxTracker to stake bnGmx
//   await sendTxn(bnGmx.setHandler(feeGmxTracker.address, true), "bnGmx.setHandler(feeGmxTracker")
//   // allow rewardRouter to burn bnGmx
//   await sendTxn(bnGmx.setMinter(rewardRouter.address, true), "bnGmx.setMinter(rewardRouter")
//
//   // allow stakedGlpTracker to stake feeGlpTracker
//   await sendTxn(feeGlpTracker.setHandler(stakedGlpTracker.address, true), "feeGlpTracker.setHandler(stakedGlpTracker)")
//   // allow feeGlpTracker to stake glp
//   await sendTxn(glp.setHandler(feeGlpTracker.address, true), "glp.setHandler(feeGlpTracker)")
//
//   // allow rewardRouter to stake in feeGlpTracker
//   await sendTxn(feeGlpTracker.setHandler(rewardRouter.address, true), "feeGlpTracker.setHandler(rewardRouter)")
//   // allow rewardRouter to stake in stakedGlpTracker
//   await sendTxn(stakedGlpTracker.setHandler(rewardRouter.address, true), "stakedGlpTracker.setHandler(rewardRouter)")
//
//   await sendTxn(esGmx.setHandler(rewardRouter.address, true), "esGmx.setHandler(rewardRouter)")
//   await sendTxn(esGmx.setHandler(stakedGmxDistributor.address, true), "esGmx.setHandler(stakedGmxDistributor)")
//   await sendTxn(esGmx.setHandler(stakedGlpDistributor.address, true), "esGmx.setHandler(stakedGlpDistributor)")
//   await sendTxn(esGmx.setHandler(stakedGlpTracker.address, true), "esGmx.setHandler(stakedGlpTracker)")
//   await sendTxn(esGmx.setHandler(gmxVester.address, true), "esGmx.setHandler(gmxVester)")
//   await sendTxn(esGmx.setHandler(glpVester.address, true), "esGmx.setHandler(glpVester)")
//
//   await sendTxn(esGmx.setMinter(gmxVester.address, true), "esGmx.setMinter(gmxVester)")
//   await sendTxn(esGmx.setMinter(glpVester.address, true), "esGmx.setMinter(glpVester)")
//
//   await sendTxn(gmxVester.setHandler(rewardRouter.address, true), "gmxVester.setHandler(rewardRouter)")
//   await sendTxn(glpVester.setHandler(rewardRouter.address, true), "glpVester.setHandler(rewardRouter)")
//
//   await sendTxn(feeGmxTracker.setHandler(gmxVester.address, true), "feeGmxTracker.setHandler(gmxVester)")
//   await sendTxn(stakedGlpTracker.setHandler(glpVester.address, true), "stakedGlpTracker.setHandler(glpVester)")
// }

async function main() {
  const { nativeToken } = tokens
  const wallet = await ethers.getSigner();
  console.log(tokens)

  const vestingDuration = 365 * 24 * 60 * 60

  // Tnd tokens
  const tnd = await deployContract("TND", []);
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
  await sendTxn(bonusTndDistributor.setBonusMultiplier(10000), "bonusTndDistributor.setBonusMultiplier")

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

  // Other
  // const config
  const tndToVester = expandDecimals(2 * 1000 * 1000, 18)
  const tndToOwnerWallet = expandDecimals(8 * 1000 * 1000, 18)
  const esTndToDistributer = expandDecimals(50000 * 12, 18)
  const bnTndToDistributor = expandDecimals(15 * 1000 * 1000, 18)


  await sendTxn(tnd.setMinter(wallet.address, true), "tnd.setMinter(wallet)")
  await sendTxn(tnd.mint(tndVester.address, expandDecimals(2 * 1000 * 1000, 18)), "tnd.mint(tndVester")
  await sendTxn(tnd.mint(wallet.address, expandDecimals(8 * 1000 * 1000, 18)), "tnd.mint(wallet")

  // mint esTnd for distributors
  await sendTxn(esTnd.setMinter(wallet.address, true), "esTnd.setMinter(wallet)")
  await sendTxn(esTnd.mint(stakedTndDistributor.address, expandDecimals(50000 * 12, 18)), "esTnd.mint(stakedGmxDistributor") // ~50,000 TND per month
  await sendTxn(stakedTndDistributor.setTokensPerInterval("20667989410000000"), "stakedTndDistributor.setTokensPerInterval") // 0.02066798941 esTnd per second

  // mint bnTnd for distributor
  await sendTxn(bnTnd.setMinter(wallet.address, true), "bnTnd.setMinter")
  await sendTxn(bnTnd.mint(bonusTndDistributor.address, expandDecimals(15 * 1000 * 1000, 18)), "bnTnd.mint(bonusTndDistributor)")

  await sendTxn(feeTndDistributor.setTokensPerInterval("413359700000"), "feeTndDistributor.setTokensPerInterval") // 1 / (28 * 24 * 60 * 60) = 0.0000004133597 ETH per second
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
