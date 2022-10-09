const { expect, use } = require("chai")
const { solidity } = require("ethereum-waffle")
const { deployContract } = require("../shared/fixtures")
const { expandDecimals, getBlockTime, increaseTime, mineBlock, reportGasUsed, print, newWallet } = require("../shared/utilities")
const { toChainlinkPrice } = require("../shared/chainlink")
const { toUsd, toNormalizedPrice } = require("../shared/units")

use(solidity)

describe("RewardRouterV2", function () {
  const provider = waffle.provider
  const [wallet, user0, user1, user2, user3, user4] = provider.getWallets()
  const vestingDuration = 365 * 24 * 60 * 60

  let eth
  let bnb

  let tnd
  let esTnd
  let bnTnd

  let stakedTndTracker
  let stakedTndDistributor
  let bonusTndTracker
  let bonusTndDistributor
  let feeTndTracker
  let feeTndDistributor

  let tndVester
  let rewardRouter

  // beforeEach(async () => {
  //   // Eth
  //   eth = await deployContract("Token", [])
  //   bnb = await deployContract("Token", [])
  //
  //   // Tnd tokens
  //   tnd = await deployContract("TND", []);
  //   esTnd = await deployContract("EsTND", []);
  //   bnTnd = await deployContract("MintableBaseToken", ["Bonus TND", "bnTND", 0]);
  //
  //   // StakeTndTracker
  //   stakedTndTracker = await deployContract("RewardTracker", ["Staked TND", "sTND"])
  //   stakedTndDistributor = await deployContract("RewardDistributor", [esTnd.address, stakedTndTracker.address])
  //   await stakedTndTracker.initialize([tnd.address, esTnd.address], stakedTndDistributor.address)
  //   await stakedTndDistributor.updateLastDistributionTime()
  //
  //   // BonusTndTracker
  //   bonusTndTracker = await deployContract("RewardTracker", ["Staked + Bonus TND", "sbTND"])
  //   bonusTndDistributor = await deployContract("BonusDistributor", [bnTnd.address, bonusTndTracker.address])
  //   await bonusTndTracker.initialize([stakedTndTracker.address], bonusTndDistributor.address)
  //   await bonusTndDistributor.updateLastDistributionTime()
  //
  //   // FeeTndTracker
  //   feeTndTracker = await deployContract("RewardTracker", ["Staked + Bonus + Fee TND", "sbfTND"])
  //   feeTndDistributor = await deployContract("RewardDistributor", [eth.address, feeTndTracker.address])
  //   await feeTndTracker.initialize([bonusTndTracker.address, bnTnd.address], feeTndDistributor.address)
  //   await feeTndDistributor.updateLastDistributionTime()
  //
  //   // allow bonusTndTracker to stake stakedTndTracker
  //   await stakedTndTracker.setHandler(bonusTndTracker.address, true)
  //   // allow bonusTndTracker to stake feeTndTracker
  //   await bonusTndTracker.setHandler(feeTndTracker.address, true)
  //   await bonusTndDistributor.setBonusMultiplier(10000)
  //   // allow feeTndTracker to stake bnTnd
  //   await bnTnd.setHandler(feeTndTracker.address, true)
  //
  //   // mint esTnd for distributors
  //   await esTnd.setMinter(wallet.address, true)
  //   // await esTnd.mint(stakedTndDistributor.address, expandDecimals(50000, 18))
  //   await esTnd.mint(stakedTndDistributor.address, expandDecimals(10000000, 18))
  //   await stakedTndDistributor.setTokensPerInterval("20667989410000000") // 0.02066798941 esTnd per second
  //
  //   // mint bnTnd for distributor
  //   await bnTnd.setMinter(wallet.address, true)
  //   await bnTnd.mint(bonusTndDistributor.address, expandDecimals(1500, 18))
  //
  //   // Vester
  //   tndVester = await deployContract("Vester", [
  //     "Vested TND",             // _name
  //     "vTND",                   // _symbol
  //     vestingDuration,          // _vestingDuration
  //     esTnd.address,            // _esToken
  //     feeTndTracker.address,    // _pairToken
  //     tnd.address,              // _claimableToken
  //     stakedTndTracker.address, // _rewardTracker
  //   ])
  //
  //   // Router
  //   rewardRouter = await deployContract("RewardRouterV2", [])
  //   await rewardRouter.initialize(
  //       eth.address, //eth.address,
  //       tnd.address,
  //       esTnd.address,
  //       bnTnd.address,
  //       stakedTndTracker.address,
  //       bonusTndTracker.address,
  //       feeTndTracker.address,
  //       tndVester.address,
  //   )
  //
  //   // await esTnd.setHandler(tokenManager.address, true)
  //   await tndVester.setHandler(wallet.address, true)
  //
  //   // await stakedTndTracker.setInPrivateTransferMode(true)
  //   // await stakedTndTracker.setInPrivateStakingMode(true)
  //   // await bonusTndTracker.setInPrivateTransferMode(true)
  //   // await bonusTndTracker.setInPrivateStakingMode(true)
  //   // await bonusTndTracker.setInPrivateClaimingMode(true)
  //   // await feeTndTracker.setInPrivateTransferMode(true)
  //   // await feeTndTracker.setInPrivateStakingMode(true)
  //   //
  //   // await esTnd.setInPrivateTransferMode(true)
  //
  //   // updateEsTndHandlers
  //   esTnd.setHandler(rewardRouter.address, true)
  //   esTnd.setHandler(stakedTndDistributor.address, true)
  //   esTnd.setHandler(stakedTndTracker.address, true)
  //   esTnd.setHandler(tndVester.address, true)
  //
  //   // enableRewardRouter
  //   stakedTndTracker.setHandler(rewardRouter.address, true)
  //   bonusTndTracker.setHandler(rewardRouter.address, true)
  //   feeTndTracker.setHandler(rewardRouter.address, true)
  //   esTnd.setHandler(rewardRouter.address, true)
  //   bnTnd.setMinter(rewardRouter.address, true)
  //   esTnd.setMinter(tndVester.address, true)
  //   tndVester.setHandler(rewardRouter.address, true)
  //   feeTndTracker.setHandler(tndVester.address, true)
  //
  // })

  beforeEach(async () => {
    // Eth
    eth = await deployContract("Token", [])
    bnb = await deployContract("Token", [])

    // Tnd tokens
    tnd = await deployContract("TND", []);
    esTnd = await deployContract("EsTND", []);
    bnTnd = await deployContract("MintableBaseToken", ["Bonus TND", "bnTND", 0]);

    // StakeTndTracker
    stakedTndTracker = await deployContract("RewardTracker", ["Staked TND", "sTND"])
    stakedTndDistributor = await deployContract("RewardDistributor", [esTnd.address, stakedTndTracker.address])
    await stakedTndTracker.initialize([tnd.address, esTnd.address], stakedTndDistributor.address)
    await stakedTndDistributor.updateLastDistributionTime()

    // BonusTndTracker
    bonusTndTracker = await deployContract("RewardTracker", ["Staked + Bonus TND", "sbTND"])
    bonusTndDistributor = await deployContract("BonusDistributor", [bnTnd.address, bonusTndTracker.address])
    await bonusTndTracker.initialize([stakedTndTracker.address], bonusTndDistributor.address)
    await bonusTndDistributor.updateLastDistributionTime()

    // FeeTndTracker
    feeTndTracker = await deployContract("RewardTracker", ["Staked + Bonus + Fee TND", "sbfTND"])
    feeTndDistributor = await deployContract("RewardDistributor", [eth.address, feeTndTracker.address])
    await feeTndTracker.initialize([bonusTndTracker.address, bnTnd.address], feeTndDistributor.address)
    await feeTndDistributor.updateLastDistributionTime()

    // Vester
    tndVester = await deployContract("Vester", [
      "Vested TND",             // _name
      "vTND",                   // _symbol
      vestingDuration,          // _vestingDuration
      esTnd.address,            // _esToken
      feeTndTracker.address,    // _pairToken
      tnd.address,              // _claimableToken
      stakedTndTracker.address, // _rewardTracker
    ])

    // Router
    rewardRouter = await deployContract("RewardRouterV2", [])
    await rewardRouter.initialize(
        eth.address, //eth.address,
        tnd.address,
        esTnd.address,
        bnTnd.address,
        stakedTndTracker.address,
        bonusTndTracker.address,
        feeTndTracker.address,
        tndVester.address,
    )

    // Set private
    await esTnd.setInPrivateTransferMode(true)
    await stakedTndTracker.setInPrivateTransferMode(true)
    await stakedTndTracker.setInPrivateStakingMode(true)
    await bonusTndTracker.setInPrivateTransferMode(true)
    await bonusTndTracker.setInPrivateStakingMode(true)
    await bonusTndTracker.setInPrivateClaimingMode(true)
    await feeTndTracker.setInPrivateTransferMode(true)
    await feeTndTracker.setInPrivateStakingMode(true)

    // Set handler and minter
    await stakedTndTracker.setHandler(rewardRouter.address, true)
    await stakedTndTracker.setHandler(bonusTndTracker.address, true)

    await bonusTndTracker.setHandler(rewardRouter.address, true)
    await bonusTndTracker.setHandler(feeTndTracker.address, true)
    await bonusTndDistributor.setBonusMultiplier(10000)

    await feeTndTracker.setHandler(rewardRouter.address, true)
    await feeTndTracker.setHandler(tndVester.address, true)

    await esTnd.setHandler(rewardRouter.address, true)
    await esTnd.setHandler(stakedTndTracker.address, true)
    await esTnd.setHandler(stakedTndDistributor.address, true)
    await esTnd.setHandler(tndVester.address, true)
    await esTnd.setMinter(tndVester.address, true)

    await bnTnd.setHandler(feeTndTracker.address, true)
    await bnTnd.setMinter(rewardRouter.address, true)

    await tndVester.setHandler(rewardRouter.address, true)

    // Other
    await stakedTndDistributor.setTokensPerInterval("20667989410000000") // 0.02066798941 esTnd per second

    await bnTnd.setMinter(wallet.address, true)
    await bnTnd.mint(bonusTndDistributor.address, expandDecimals(1500, 18))

    await esTnd.setMinter(wallet.address, true)
    await esTnd.mint(stakedTndDistributor.address, expandDecimals(50000, 18))

    await tndVester.setHandler(wallet.address, true)
  })

  it("inits", async () => {
    expect(await rewardRouter.isInitialized()).eq(true)

    expect(await rewardRouter.weth()).eq(eth.address)
    expect(await rewardRouter.tnd()).eq(tnd.address)
    expect(await rewardRouter.esTnd()).eq(esTnd.address)
    expect(await rewardRouter.bnTnd()).eq(bnTnd.address)

    expect(await rewardRouter.stakedTndTracker()).eq(stakedTndTracker.address)
    expect(await rewardRouter.bonusTndTracker()).eq(bonusTndTracker.address)
    expect(await rewardRouter.feeTndTracker()).eq(feeTndTracker.address)

    expect(await rewardRouter.tndVester()).eq(tndVester.address)

    await expect(rewardRouter.initialize(
      eth.address,
      tnd.address,
      esTnd.address,
      bnTnd.address,
      stakedTndTracker.address,
      bonusTndTracker.address,
      feeTndTracker.address,
      tndVester.address,
    )).to.be.revertedWith("RewardRouter: already initialized")
  })

  it("stakeTndForAccount, stakeTnd, stakeEsTnd, unstakeTnd, unstakeEsTnd, claimEsTnd, claimFees, compound, batchCompoundForAccounts", async () => {
    await eth.mint(feeTndDistributor.address, expandDecimals(100, 18))
    await feeTndDistributor.setTokensPerInterval("41335970000000") // 0.00004133597 ETH per second

    await tnd.setMinter(wallet.address, true)
    await tnd.mint(user0.address, expandDecimals(1500, 18))
    expect(await tnd.balanceOf(user0.address)).eq(expandDecimals(1500, 18))

    await tnd.connect(user0).approve(stakedTndTracker.address, expandDecimals(1000, 18))
    await expect(rewardRouter.connect(user0).stakeTndForAccount(user1.address, expandDecimals(1000, 18)))
      .to.be.revertedWith("Governable: forbidden")

    await rewardRouter.setGov(user0.address)
    await rewardRouter.connect(user0).stakeTndForAccount(user1.address, expandDecimals(800, 18))
    expect(await tnd.balanceOf(user0.address)).eq(expandDecimals(700, 18))

    await tnd.mint(user1.address, expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(expandDecimals(200, 18))
    await tnd.connect(user1).approve(stakedTndTracker.address, expandDecimals(200, 18))
    await rewardRouter.connect(user1).stakeTnd(expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(0)

    expect(await stakedTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user0.address, tnd.address)).eq(0)
    expect(await stakedTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(1000, 18))

    expect(await bonusTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await bonusTndTracker.depositBalances(user0.address, stakedTndTracker.address)).eq(0)
    expect(await bonusTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await bonusTndTracker.depositBalances(user1.address, stakedTndTracker.address)).eq(expandDecimals(1000, 18))

    expect(await feeTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user0.address, bonusTndTracker.address)).eq(0)
    expect(await feeTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).eq(expandDecimals(1000, 18))

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    expect(await stakedTndTracker.claimable(user0.address)).eq(0)
    expect(await stakedTndTracker.claimable(user1.address)).gt(expandDecimals(1785, 18)) // 50000 / 28 => ~1785
    expect(await stakedTndTracker.claimable(user1.address)).lt(expandDecimals(1786, 18))

    expect(await bonusTndTracker.claimable(user0.address)).eq(0)
    expect(await bonusTndTracker.claimable(user1.address)).gt("2730000000000000000") // 2.73, 1000 / 365 => ~2.74
    expect(await bonusTndTracker.claimable(user1.address)).lt("2750000000000000000") // 2.75

    expect(await feeTndTracker.claimable(user0.address)).eq(0)
    expect(await feeTndTracker.claimable(user1.address)).gt("3560000000000000000") // 3.56, 100 / 28 => ~3.57
    expect(await feeTndTracker.claimable(user1.address)).lt("3580000000000000000") // 3.58

    await esTnd.mint(user2.address, expandDecimals(500, 18))
    await rewardRouter.connect(user2).stakeEsTnd(expandDecimals(500, 18))

    expect(await stakedTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user0.address, tnd.address)).eq(0)
    expect(await stakedTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(1000, 18))
    expect(await stakedTndTracker.stakedAmounts(user2.address)).eq(expandDecimals(500, 18))
    expect(await stakedTndTracker.depositBalances(user2.address, esTnd.address)).eq(expandDecimals(500, 18))

    expect(await bonusTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await bonusTndTracker.depositBalances(user0.address, stakedTndTracker.address)).eq(0)
    expect(await bonusTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await bonusTndTracker.depositBalances(user1.address, stakedTndTracker.address)).eq(expandDecimals(1000, 18))
    expect(await bonusTndTracker.stakedAmounts(user2.address)).eq(expandDecimals(500, 18))
    expect(await bonusTndTracker.depositBalances(user2.address, stakedTndTracker.address)).eq(expandDecimals(500, 18))

    expect(await feeTndTracker.stakedAmounts(user0.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user0.address, bonusTndTracker.address)).eq(0)
    expect(await feeTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(1000, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).eq(expandDecimals(1000, 18))
    expect(await feeTndTracker.stakedAmounts(user2.address)).eq(expandDecimals(500, 18))
    expect(await feeTndTracker.depositBalances(user2.address, bonusTndTracker.address)).eq(expandDecimals(500, 18))

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    expect(await stakedTndTracker.claimable(user0.address)).eq(0)
    expect(await stakedTndTracker.claimable(user1.address)).gt(expandDecimals(1785 + 1190, 18))
    expect(await stakedTndTracker.claimable(user1.address)).lt(expandDecimals(1786 + 1191, 18))
    expect(await stakedTndTracker.claimable(user2.address)).gt(expandDecimals(595, 18))
    expect(await stakedTndTracker.claimable(user2.address)).lt(expandDecimals(596, 18))

    expect(await bonusTndTracker.claimable(user0.address)).eq(0)
    expect(await bonusTndTracker.claimable(user1.address)).gt("5470000000000000000") // 5.47, 1000 / 365 * 2 => ~5.48
    expect(await bonusTndTracker.claimable(user1.address)).lt("5490000000000000000")
    expect(await bonusTndTracker.claimable(user2.address)).gt("1360000000000000000") // 1.36, 500 / 365 => ~1.37
    expect(await bonusTndTracker.claimable(user2.address)).lt("1380000000000000000")

    expect(await feeTndTracker.claimable(user0.address)).eq(0)
    expect(await feeTndTracker.claimable(user1.address)).gt("5940000000000000000") // 5.94, 3.57 + 100 / 28 / 3 * 2 => ~5.95
    expect(await feeTndTracker.claimable(user1.address)).lt("5960000000000000000")
    expect(await feeTndTracker.claimable(user2.address)).gt("1180000000000000000") // 1.18, 100 / 28 / 3 => ~1.19
    expect(await feeTndTracker.claimable(user2.address)).lt("1200000000000000000")

    expect(await esTnd.balanceOf(user1.address)).eq(0)
    await rewardRouter.connect(user1).claimEsTnd()
    expect(await esTnd.balanceOf(user1.address)).gt(expandDecimals(1785 + 1190, 18))
    expect(await esTnd.balanceOf(user1.address)).lt(expandDecimals(1786 + 1191, 18))

    expect(await eth.balanceOf(user1.address)).eq(0)
    await rewardRouter.connect(user1).claimFees()
    expect(await eth.balanceOf(user1.address)).gt("5940000000000000000")
    expect(await eth.balanceOf(user1.address)).lt("5960000000000000000")

    expect(await esTnd.balanceOf(user2.address)).eq(0)
    await rewardRouter.connect(user2).claimEsTnd()
    expect(await esTnd.balanceOf(user2.address)).gt(expandDecimals(595, 18))
    expect(await esTnd.balanceOf(user2.address)).lt(expandDecimals(596, 18))

    expect(await eth.balanceOf(user2.address)).eq(0)
    await rewardRouter.connect(user2).claimFees()
    expect(await eth.balanceOf(user2.address)).gt("1180000000000000000")
    expect(await eth.balanceOf(user2.address)).lt("1200000000000000000")

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    const tx0 = await rewardRouter.connect(user1).compound()
    await reportGasUsed(provider, tx0, "compound gas used")

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    const tx1 = await rewardRouter.connect(user0).batchCompoundForAccounts([user1.address, user2.address])
    await reportGasUsed(provider, tx1, "batchCompoundForAccounts gas used")

    expect(await stakedTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3643, 18))
    expect(await stakedTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3645, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(1000, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(2643, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(2645, 18))

    expect(await bonusTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3643, 18))
    expect(await bonusTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3645, 18))

    expect(await feeTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3657, 18))
    expect(await feeTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3659, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).gt(expandDecimals(3643, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).lt(expandDecimals(3645, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("14100000000000000000") // 14.1
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("14300000000000000000") // 14.3

    expect(await tnd.balanceOf(user1.address)).eq(0)
    await rewardRouter.connect(user1).unstakeTnd(expandDecimals(300, 18))
    expect(await tnd.balanceOf(user1.address)).eq(expandDecimals(300, 18))

    expect(await stakedTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3343, 18))
    expect(await stakedTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3345, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(700, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(2643, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(2645, 18))

    expect(await bonusTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3343, 18))
    expect(await bonusTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3345, 18))

    expect(await feeTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(3357, 18))
    expect(await feeTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(3359, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).gt(expandDecimals(3343, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).lt(expandDecimals(3345, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("13000000000000000000") // 13
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("13100000000000000000") // 13.1

    const esTndBalance1 = await esTnd.balanceOf(user1.address)
    const esTndUnstakeBalance1 = await stakedTndTracker.depositBalances(user1.address, esTnd.address)
    await rewardRouter.connect(user1).unstakeEsTnd(esTndUnstakeBalance1)
    expect(await esTnd.balanceOf(user1.address)).eq(esTndBalance1.add(esTndUnstakeBalance1))

    expect(await stakedTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(700, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(700, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).eq(0)

    expect(await bonusTndTracker.stakedAmounts(user1.address)).eq(expandDecimals(700, 18))

    expect(await feeTndTracker.stakedAmounts(user1.address)).gt(expandDecimals(702, 18))
    expect(await feeTndTracker.stakedAmounts(user1.address)).lt(expandDecimals(703, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bonusTndTracker.address)).eq(expandDecimals(700, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("2720000000000000000") // 2.72
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("2740000000000000000") // 2.74

    await expect(rewardRouter.connect(user1).unstakeEsTnd(expandDecimals(1, 18)))
      .to.be.revertedWith("RewardTracker: _amount exceeds depositBalance")
  })

  it("tnd: signalTransfer, acceptTransfer", async () =>{
    await tnd.setMinter(wallet.address, true)
    await tnd.mint(user1.address, expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(expandDecimals(200, 18))
    await tnd.connect(user1).approve(stakedTndTracker.address, expandDecimals(200, 18))
    await rewardRouter.connect(user1).stakeTnd(expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(0)

    await tnd.mint(user2.address, expandDecimals(200, 18))
    expect(await tnd.balanceOf(user2.address)).eq(expandDecimals(200, 18))
    await tnd.connect(user2).approve(stakedTndTracker.address, expandDecimals(400, 18))
    await rewardRouter.connect(user2).stakeTnd(expandDecimals(200, 18))
    expect(await tnd.balanceOf(user2.address)).eq(0)

    await rewardRouter.connect(user2).signalTransfer(user1.address)

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    await rewardRouter.connect(user2).signalTransfer(user1.address)
    await rewardRouter.connect(user1).claim()

    await expect(rewardRouter.connect(user2).signalTransfer(user1.address))
      .to.be.revertedWith("RewardRouter: stakedTndTracker.averageStakedAmounts > 0")

    await rewardRouter.connect(user2).signalTransfer(user3.address)

    await expect(rewardRouter.connect(user3).acceptTransfer(user1.address))
      .to.be.revertedWith("RewardRouter: transfer not signalled")

    await tndVester.setBonusRewards(user2.address, expandDecimals(100, 18))

    expect(await stakedTndTracker.depositBalances(user2.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user2.address, esTnd.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user2.address, bnTnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user3.address, tnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user3.address, esTnd.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user3.address, bnTnd.address)).eq(0)
    expect(await tndVester.transferredAverageStakedAmounts(user3.address)).eq(0)
    expect(await tndVester.transferredCumulativeRewards(user3.address)).eq(0)
    expect(await tndVester.bonusRewards(user2.address)).eq(expandDecimals(100, 18))
    expect(await tndVester.bonusRewards(user3.address)).eq(0)
    expect(await tndVester.getCombinedAverageStakedAmount(user2.address)).eq(0)
    expect(await tndVester.getCombinedAverageStakedAmount(user3.address)).eq(0)
    expect(await tndVester.getMaxVestableAmount(user2.address)).eq(expandDecimals(100, 18))
    expect(await tndVester.getMaxVestableAmount(user3.address)).eq(0)
    expect(await tndVester.getPairAmount(user2.address, expandDecimals(892, 18))).eq(0)
    expect(await tndVester.getPairAmount(user3.address, expandDecimals(892, 18))).eq(0)

    await rewardRouter.connect(user3).acceptTransfer(user2.address)

    expect(await stakedTndTracker.depositBalances(user2.address, tnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user2.address, esTnd.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user2.address, bnTnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user3.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user3.address, esTnd.address)).gt(expandDecimals(892, 18))
    expect(await stakedTndTracker.depositBalances(user3.address, esTnd.address)).lt(expandDecimals(893, 18))
    expect(await feeTndTracker.depositBalances(user3.address, bnTnd.address)).gt("547000000000000000") // 0.547
    expect(await feeTndTracker.depositBalances(user3.address, bnTnd.address)).lt("549000000000000000") // 0.548
    expect(await tndVester.transferredAverageStakedAmounts(user3.address)).eq(expandDecimals(200, 18))
    expect(await tndVester.transferredCumulativeRewards(user3.address)).gt(expandDecimals(892, 18))
    expect(await tndVester.transferredCumulativeRewards(user3.address)).lt(expandDecimals(893, 18))
    expect(await tndVester.bonusRewards(user2.address)).eq(0)
    expect(await tndVester.bonusRewards(user3.address)).eq(expandDecimals(100, 18))
    expect(await tndVester.getCombinedAverageStakedAmount(user2.address)).eq(expandDecimals(200, 18))
    expect(await tndVester.getCombinedAverageStakedAmount(user3.address)).eq(expandDecimals(200, 18))
    expect(await tndVester.getMaxVestableAmount(user2.address)).eq(0)
    expect(await tndVester.getMaxVestableAmount(user3.address)).gt(expandDecimals(992, 18))
    expect(await tndVester.getMaxVestableAmount(user3.address)).lt(expandDecimals(993, 18))
    expect(await tndVester.getPairAmount(user2.address, expandDecimals(992, 18))).eq(0)
    expect(await tndVester.getPairAmount(user3.address, expandDecimals(992, 18))).gt(expandDecimals(199, 18))
    expect(await tndVester.getPairAmount(user3.address, expandDecimals(992, 18))).lt(expandDecimals(200, 18))

    await tnd.connect(user3).approve(stakedTndTracker.address, expandDecimals(400, 18))
    await rewardRouter.connect(user3).signalTransfer(user4.address)
    await rewardRouter.connect(user4).acceptTransfer(user3.address)

    expect(await stakedTndTracker.depositBalances(user3.address, tnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user3.address, esTnd.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user3.address, bnTnd.address)).eq(0)
    expect(await stakedTndTracker.depositBalances(user4.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user4.address, esTnd.address)).gt(expandDecimals(892, 18))
    expect(await stakedTndTracker.depositBalances(user4.address, esTnd.address)).lt(expandDecimals(893, 18))
    expect(await feeTndTracker.depositBalances(user4.address, bnTnd.address)).gt("547000000000000000") // 0.547
    expect(await feeTndTracker.depositBalances(user4.address, bnTnd.address)).lt("549000000000000000") // 0.548
    expect(await tndVester.transferredAverageStakedAmounts(user4.address)).gt(expandDecimals(200, 18))
    expect(await tndVester.transferredAverageStakedAmounts(user4.address)).lt(expandDecimals(201, 18))
    expect(await tndVester.transferredCumulativeRewards(user4.address)).gt(expandDecimals(892, 18))
    expect(await tndVester.transferredCumulativeRewards(user4.address)).lt(expandDecimals(894, 18))
    expect(await tndVester.bonusRewards(user3.address)).eq(0)
    expect(await tndVester.bonusRewards(user4.address)).eq(expandDecimals(100, 18))
    expect(await stakedTndTracker.averageStakedAmounts(user3.address)).gt(expandDecimals(1092, 18))
    expect(await stakedTndTracker.averageStakedAmounts(user3.address)).lt(expandDecimals(1094, 18))
    expect(await tndVester.transferredAverageStakedAmounts(user3.address)).eq(0)
    expect(await tndVester.getCombinedAverageStakedAmount(user3.address)).gt(expandDecimals(1092, 18))
    expect(await tndVester.getCombinedAverageStakedAmount(user3.address)).lt(expandDecimals(1094, 18))
    expect(await tndVester.getCombinedAverageStakedAmount(user4.address)).gt(expandDecimals(200, 18))
    expect(await tndVester.getCombinedAverageStakedAmount(user4.address)).lt(expandDecimals(201, 18))
    expect(await tndVester.getMaxVestableAmount(user3.address)).eq(0)
    expect(await tndVester.getMaxVestableAmount(user4.address)).gt(expandDecimals(992, 18))
    expect(await tndVester.getMaxVestableAmount(user4.address)).lt(expandDecimals(993, 18))
    expect(await tndVester.getPairAmount(user3.address, expandDecimals(992, 18))).eq(0)
    expect(await tndVester.getPairAmount(user4.address, expandDecimals(992, 18))).gt(expandDecimals(199, 18))
    expect(await tndVester.getPairAmount(user4.address, expandDecimals(992, 18))).lt(expandDecimals(200, 18))

    await expect(rewardRouter.connect(user4).acceptTransfer(user3.address))
      .to.be.revertedWith("RewardRouter: transfer not signalled")
  })

  it("handleRewards", async () => {
    await eth.deposit({ value: expandDecimals(10, 18) })

    await tnd.setMinter(wallet.address, true)
    await tnd.mint(tndVester.address, expandDecimals(10000, 18))

    await eth.mint(feeTndDistributor.address, expandDecimals(50, 18))
    await feeTndDistributor.setTokensPerInterval("41335970000000") // 0.00004133597 ETH per second

    await tnd.mint(user1.address, expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(expandDecimals(200, 18))
    await tnd.connect(user1).approve(stakedTndTracker.address, expandDecimals(200, 18))
    await rewardRouter.connect(user1).stakeTnd(expandDecimals(200, 18))
    expect(await tnd.balanceOf(user1.address)).eq(0)

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    expect(await tnd.balanceOf(user1.address)).eq(0)
    expect(await esTnd.balanceOf(user1.address)).eq(0)
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).eq(0)

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).eq(0)
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).eq(0)

    await rewardRouter.connect(user1).handleRewards(
        true, // _shouldClaimTnd
        true, // _shouldStakeTnd
        true, // _shouldClaimEsTnd
        true, // _shouldStakeEsTnd
        true, // _shouldStakeMultiplierPoints
        true, // _shouldClaimWeth
        false // _shouldConvertWethToEth
    )

    expect(await tnd.balanceOf(user1.address)).eq(0)
    expect(await esTnd.balanceOf(user1.address)).eq(0)
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).gt("3560000000000000000") // 3.56, 100 / 28 => ~3.57
    expect(await eth.balanceOf(user1.address)).lt("3580000000000000000") // 3.58

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(1785, 18)) // 50000 / 28 => ~1785
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(1786, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("540000000000000000") // 200 / 365 => ~0.55
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("560000000000000000") // 0.56

    await increaseTime(provider, 24 * 60 * 60)
    await mineBlock(provider)

    const ethBalance0 = await provider.getBalance(user1.address)

    await rewardRouter.connect(user1).handleRewards(
        false, // _shouldClaimTnd
        false, // _shouldStakeTnd
        false, // _shouldClaimEsTnd
        false, // _shouldStakeEsTnd
        false, // _shouldStakeMultiplierPoints
        true, // _shouldClaimWeth
        true // _shouldConvertWethToEth
    )

    const ethBalance1 = await provider.getBalance(user1.address)

    expect(await ethBalance1.sub(ethBalance0)).gt("3560000000000000000")
    expect(await ethBalance1.sub(ethBalance0)).lt("3580000000000000000")

    expect(await tnd.balanceOf(user1.address)).eq(0)
    expect(await esTnd.balanceOf(user1.address)).eq(0)
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).gt("3560000000000000000")
    expect(await eth.balanceOf(user1.address)).lt("3580000000000000000")

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(1785, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(1786, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("540000000000000000")
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("560000000000000000")

    await rewardRouter.connect(user1).handleRewards(
        false, // _shouldClaimTnd
        false, // _shouldStakeTnd
        true, // _shouldClaimEsTnd
        false, // _shouldStakeEsTnd
        false, // _shouldStakeMultiplierPoints
        false, // _shouldClaimWeth
        false // _shouldConvertWethToEth
    )

    expect(await tnd.balanceOf(user1.address)).eq(0)
    expect(await esTnd.balanceOf(user1.address)).gt(expandDecimals(1785, 18))
    expect(await esTnd.balanceOf(user1.address)).lt(expandDecimals(1786, 18))
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).gt("3560000000000000000")
    expect(await eth.balanceOf(user1.address)).lt("3580000000000000000")

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(1785, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(1786, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("540000000000000000")
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("560000000000000000")

    await tndVester.connect(user1).deposit(expandDecimals(365, 18))

    expect(await tnd.balanceOf(user1.address)).eq(0)
    expect(await esTnd.balanceOf(user1.address)).gt(expandDecimals(1785 - 365, 18))
    expect(await esTnd.balanceOf(user1.address)).lt(expandDecimals(1786 - 365, 18))
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).gt("3560000000000000000")
    expect(await eth.balanceOf(user1.address)).lt("3580000000000000000")

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(1785, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(1786, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("540000000000000000")
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("560000000000000000")

    await increaseTime(provider, 24 * 60 * 60 * 3)
    await mineBlock(provider)

    await rewardRouter.connect(user1).handleRewards(
        true, // _shouldClaimTnd
        false, // _shouldStakeTnd
        false, // _shouldClaimEsTnd
        false, // _shouldStakeEsTnd
        false, // _shouldStakeMultiplierPoints
        false, // _shouldClaimWeth
        false // _shouldConvertWethToEth
    )

    expect(await tnd.balanceOf(user1.address)).gt("2900000000000000000") // 2.9
    expect(await tnd.balanceOf(user1.address)).lt("3100000000000000000") // 3.1
    expect(await esTnd.balanceOf(user1.address)).gt(expandDecimals(1785 - 365, 18))
    expect(await esTnd.balanceOf(user1.address)).lt(expandDecimals(1786 - 365, 18))
    expect(await bnTnd.balanceOf(user1.address)).eq(0)
    expect(await eth.balanceOf(user1.address)).gt("3560000000000000000")
    expect(await eth.balanceOf(user1.address)).lt("3580000000000000000")

    expect(await stakedTndTracker.depositBalances(user1.address, tnd.address)).eq(expandDecimals(200, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).gt(expandDecimals(1785, 18))
    expect(await stakedTndTracker.depositBalances(user1.address, esTnd.address)).lt(expandDecimals(1786, 18))
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).gt("540000000000000000")
    expect(await feeTndTracker.depositBalances(user1.address, bnTnd.address)).lt("560000000000000000")

    // await esTnd.mint(user1.address, expandDecimals(10000, 18))
    // expect(await esTnd.balanceOf(user1.address)).gt(expandDecimals(1785 - 365 + 10000, 18))
    // expect(await esTnd.balanceOf(user1.address)).lt(expandDecimals(1786 - 365 + 10000, 18))
    //
    // console.log((await stakedTndTracker.claimable(user1.address)).toString() / expandDecimals(1, 18))
    //
    // await rewardRouter.connect(user1).claimEsTnd()
    // await tndVester.connect(user1).deposit(expandDecimals(3207, 18))
  })
})
