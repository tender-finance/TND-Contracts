const { expect, use } = require("chai")
const { solidity } = require("ethereum-waffle")
const { deployContract } = require("../shared/fixtures")
const { expandDecimals, getBlockTime, increaseTime, mineBlock, reportGasUsed, print } = require("../shared/utilities")
const { toChainlinkPrice } = require("../shared/chainlink")
const { toUsd, toNormalizedPrice } = require("../shared/units")

use(solidity)

describe("BonusDistributor", function () {
  const provider = waffle.provider
  const [wallet, rewardRouter, user0, user1, user2, user3] = provider.getWallets()
  let tnd
  let esTnd
  let bnTnd
  let stakedTndTracker
  let stakedTndDistributor
  let bonusTndTracker
  let bonusTndDistributor

  beforeEach(async () => {
    tnd = await deployContract("TND", []);
    esTnd = await deployContract("EsTND", []);
    bnTnd = await deployContract("MintableBaseToken", ["Bonus TND", "bnTND", 0]);

    stakedTndTracker = await deployContract("RewardTracker", ["Staked TND", "stTND"])
    stakedTndDistributor = await deployContract("RewardDistributor", [esTnd.address, stakedTndTracker.address])
    await stakedTndDistributor.updateLastDistributionTime()

    bonusTndTracker = await deployContract("RewardTracker", ["Staked + Bonus TND", "sbTND"])
    bonusTndDistributor = await deployContract("BonusDistributor", [bnTnd.address, bonusTndTracker.address])
    await bonusTndDistributor.updateLastDistributionTime()

    await stakedTndTracker.initialize([tnd.address, esTnd.address], stakedTndDistributor.address)
    await bonusTndTracker.initialize([stakedTndTracker.address], bonusTndDistributor.address)

    await stakedTndTracker.setInPrivateTransferMode(true)
    await stakedTndTracker.setInPrivateStakingMode(true)
    await bonusTndTracker.setInPrivateTransferMode(true)
    await bonusTndTracker.setInPrivateStakingMode(true)

    await stakedTndTracker.setHandler(rewardRouter.address, true)
    await stakedTndTracker.setHandler(bonusTndTracker.address, true)
    await bonusTndTracker.setHandler(rewardRouter.address, true)
    await bonusTndDistributor.setBonusMultiplier(10000)
  })

  it("distributes bonus", async () => {
    await esTnd.setMinter(wallet.address, true)
    await esTnd.mint(stakedTndDistributor.address, expandDecimals(50000, 18))
    await bnTnd.setMinter(wallet.address, true)
    await bnTnd.mint(bonusTndDistributor.address, expandDecimals(1500, 18))
    await stakedTndDistributor.setTokensPerInterval("20667989410000000") // 0.02066798941 esGmx per second
    await tnd.setMinter(wallet.address, true)
    await tnd.mint(user0.address, expandDecimals(1000, 18))

    await tnd.connect(user0).approve(stakedTndTracker.address, expandDecimals(1001, 18))
    await expect(stakedTndTracker.connect(rewardRouter).stakeForAccount(user0.address, user0.address, tnd.address, expandDecimals(1001, 18)))
      .to.be.revertedWith("BaseToken: transfer amount exceeds balance")
    await stakedTndTracker.connect(rewardRouter).stakeForAccount(user0.address, user0.address, tnd.address, expandDecimals(1000, 18))
    await expect(bonusTndTracker.connect(rewardRouter).stakeForAccount(user0.address, user0.address, stakedTndTracker.address, expandDecimals(1001, 18)))
      .to.be.revertedWith("RewardTracker: transfer amount exceeds balance")
    await bonusTndTracker.connect(rewardRouter).stakeForAccount(user0.address, user0.address, stakedTndTracker.address, expandDecimals(1000, 18))

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    expect(await stakedTndTracker.claimable(user0.address)).gt(expandDecimals(1785, 18)) // 50000 / 28 => ~1785
    expect(await stakedTndTracker.claimable(user0.address)).lt(expandDecimals(1786, 18))
    expect(await bonusTndTracker.claimable(user0.address)).gt("2730000000000000000") // 2.73, 1000 / 365 => ~2.74
    expect(await bonusTndTracker.claimable(user0.address)).lt("2750000000000000000") // 2.75

    await esTnd.mint(user1.address, expandDecimals(500, 18))
    await esTnd.connect(user1).approve(stakedTndTracker.address, expandDecimals(500, 18))
    await stakedTndTracker.connect(rewardRouter).stakeForAccount(user1.address, user1.address, esTnd.address, expandDecimals(500, 18))
    await bonusTndTracker.connect(rewardRouter).stakeForAccount(user1.address, user1.address, stakedTndTracker.address, expandDecimals(500, 18))

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    expect(await stakedTndTracker.claimable(user0.address)).gt(expandDecimals(1785 + 1190, 18))
    expect(await stakedTndTracker.claimable(user0.address)).lt(expandDecimals(1786 + 1191, 18))

    expect(await stakedTndTracker.claimable(user1.address)).gt(expandDecimals(595, 18))
    expect(await stakedTndTracker.claimable(user1.address)).lt(expandDecimals(596, 18))

    expect(await bonusTndTracker.claimable(user0.address)).gt("5470000000000000000") // 5.47, 1000 / 365 * 2 => ~5.48
    expect(await bonusTndTracker.claimable(user0.address)).lt("5490000000000000000") // 5.49

    expect(await bonusTndTracker.claimable(user1.address)).gt("1360000000000000000") // 1.36, 500 / 365 => ~1.37
    expect(await bonusTndTracker.claimable(user1.address)).lt("1380000000000000000") // 1.38
  })
})
