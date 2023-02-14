const { deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")
const {expandDecimals} = require("../../test/shared/utilities");

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('../core/tokens')[network];

async function main() {

  const newGov = "0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2"

  const rewardRouter = await contractAt("RewardRouterV2", "0xca11F41b1384A7Af40be244eFb602F1a5aFeFf61")
  const bnTnd = await contractAt("MintableBaseToken", await rewardRouter.bnTnd())
  const bonusTndTracker = await contractAt("RewardTracker", await rewardRouter.bonusTndTracker())
  const esTnd = await contractAt("EsTND", await rewardRouter.esTnd())
  const feeTndTracker = await contractAt("RewardTracker", await rewardRouter.feeTndTracker())
  const stakedTndTracker = await contractAt("RewardTracker", await rewardRouter.stakedTndTracker())
  const tndVester = await contractAt("Vester", await rewardRouter.tndVester())

  const bonusTndDistributor = await contractAt("BonusDistributor", await bonusTndTracker.distributor())
  const feeTndDistributor = await contractAt("RewardDistributor", await feeTndTracker.distributor())
  const stakedTndDistributor = await contractAt("RewardDistributor", await stakedTndTracker.distributor())

  await rewardRouter.setGov(newGov)
  await bnTnd.setGov(newGov)
  await bonusTndTracker.setGov(newGov)
  await esTnd.setGov(newGov)
  await feeTndTracker.setGov(newGov)
  await stakedTndTracker.setGov(newGov)
  await tndVester.setGov(newGov)

  await bonusTndDistributor.setAdmin(newGov)
  await bonusTndDistributor.setGov(newGov)

  await feeTndDistributor.setAdmin(newGov)
  await feeTndDistributor.setGov(newGov)

  await stakedTndDistributor.setAdmin(newGov)
  await stakedTndDistributor.setGov(newGov)

  console.log("-------------------------------")
  console.log("Set governments:")
  console.log("rewardRouter: gov = " + await rewardRouter.gov())
  console.log("bnTnd: gov = " + await bnTnd.gov())
  console.log("bonusTndTracker: gov = " + await bonusTndTracker.gov())
  console.log("esTnd: gov = " + await esTnd.gov())
  console.log("feeTndTracker: gov = " + await feeTndTracker.gov())
  console.log("stakedTndTracker: gov = " + await stakedTndTracker.gov())
  console.log("tndVester: gov = " + await tndVester.gov())
  console.log("-------------------------------")
  console.log("bonusTndDistributor: admin = " + await bonusTndDistributor.admin())
  console.log("bonusTndDistributor: gov = " + await bonusTndDistributor.gov())
  console.log("-------------------------------")
  console.log("feeTndDistributor: admin = " + await feeTndDistributor.admin())
  console.log("feeTndDistributor: gov = " + await feeTndDistributor.gov())
  console.log("-------------------------------")
  console.log("stakedTndDistributor: admin = " + await stakedTndDistributor.admin())
  console.log("stakedTndDistributor: gov = " + await stakedTndDistributor.gov())
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
