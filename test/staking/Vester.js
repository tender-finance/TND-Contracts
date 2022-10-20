const { expect, use } = require("chai");
const { solidity } = require("ethereum-waffle");
const { deployContract } = require("../shared/fixtures");
const {
  expandDecimals,
  getBlockTime,
  increaseTime,
  mineBlock,
  reportGasUsed,
  print,
} = require("../shared/utilities");
const { toChainlinkPrice } = require("../shared/chainlink");
const { toUsd, toNormalizedPrice } = require("../shared/units");

use(solidity);

const secondsPerYear = 365 * 24 * 60 * 60;
const { AddressZero } = ethers.constants;

describe("Vester", function () {
  let tnd;
  let esTnd;
  let bnTnd;
  let eth;

  let provider;
  let wallet;
  let user0;
  let user1;
  let user2;
  let user3;
  let user4;

  before(async () => {
    provider = new ethers.providers.Web3Provider(hre.network.provider);
    [wallet, user0, user1, user2, user3, user4] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    tnd = await deployContract("TND", []);
    esTnd = await deployContract("EsTND", []);
    bnTnd = await deployContract("MintableBaseToken", [
      "Bonus TND",
      "bnTND",
      0,
    ]);
    eth = await deployContract("Token", []);

    await esTnd.setMinter(wallet.address, true);
    await tnd.setMinter(wallet.address, true);
  });

  it("inits", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);

    expect(await vester.name()).eq("Vested TND");
    expect(await vester.symbol()).eq("veTND");
    expect(await vester.vestingDuration()).eq(secondsPerYear);
    expect(await vester.esToken()).eq(esTnd.address);
    expect(await vester.pairToken()).eq(AddressZero);
    expect(await vester.claimableToken()).eq(tnd.address);
    expect(await vester.rewardTracker()).eq(AddressZero);
    expect(await vester.hasPairToken()).eq(false);
    expect(await vester.hasRewardTracker()).eq(false);
    expect(await vester.hasMaxVestableAmount()).eq(false);
  });

  it("setTransferredAverageStakedAmounts", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);

    await expect(
      vester.setTransferredAverageStakedAmounts(user0.address, 200)
    ).to.be.revertedWith("Vester: forbidden");

    await vester.setHandler(wallet.address, true);

    expect(await vester.transferredAverageStakedAmounts(user0.address)).eq(0);
    await vester.setTransferredAverageStakedAmounts(user0.address, 200);
    expect(await vester.transferredAverageStakedAmounts(user0.address)).eq(200);
  });

  it("setTransferredCumulativeRewards", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);

    await expect(
      vester.setTransferredCumulativeRewards(user0.address, 200)
    ).to.be.revertedWith("Vester: forbidden");

    await vester.setHandler(wallet.address, true);

    expect(await vester.transferredCumulativeRewards(user0.address)).eq(0);
    await vester.setTransferredCumulativeRewards(user0.address, 200);
    expect(await vester.transferredCumulativeRewards(user0.address)).eq(200);
  });

  it("setCumulativeRewardDeductions", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);

    await expect(
      vester.setCumulativeRewardDeductions(user0.address, 200)
    ).to.be.revertedWith("Vester: forbidden");

    await vester.setHandler(wallet.address, true);

    expect(await vester.cumulativeRewardDeductions(user0.address)).eq(0);
    await vester.setCumulativeRewardDeductions(user0.address, 200);
    expect(await vester.cumulativeRewardDeductions(user0.address)).eq(200);
  });

  it("setBonusRewards", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);

    await expect(vester.setBonusRewards(user0.address, 200)).to.be.revertedWith(
      "Vester: forbidden"
    );

    await vester.setHandler(wallet.address, true);

    expect(await vester.bonusRewards(user0.address)).eq(0);
    await vester.setBonusRewards(user0.address, 200);
    expect(await vester.bonusRewards(user0.address)).eq(200);
  });

  it("deposit, claim, withdraw", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);
    await esTnd.setMinter(vester.address, true);

    await expect(vester.connect(user0).deposit(0)).to.be.revertedWith(
      "Vester: invalid _amount"
    );

    await expect(
      vester.connect(user0).deposit(expandDecimals(1000, 18))
    ).to.be.revertedWith("BaseToken: transfer amount exceeds allowance");

    await esTnd
      .connect(user0)
      .approve(vester.address, expandDecimals(1000, 18));

    await expect(
      vester.connect(user0).deposit(expandDecimals(1000, 18))
    ).to.be.revertedWith("BaseToken: transfer amount exceeds balance");

    expect(await vester.balanceOf(user0.address)).eq(0);
    expect(await vester.getTotalVested(user0.address)).eq(0);
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(0);

    await esTnd.mint(user0.address, expandDecimals(1000, 18));
    await vester.connect(user0).deposit(expandDecimals(1000, 18));

    let blockTime = await getBlockTime(provider);

    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).eq(0);
    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).gt("2730000000000000000"); // 1000 / 365 => ~2.739
    expect(await vester.claimable(user0.address)).lt("2750000000000000000");
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await expect(vester.connect(user0).claim()).to.be.revertedWith(
      "BaseToken: transfer amount exceeds balance"
    );

    await tnd.mint(vester.address, expandDecimals(2000, 18));

    await vester.connect(user0).claim();
    blockTime = await getBlockTime(provider);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).gt("2730000000000000000");
    expect(await tnd.balanceOf(user0.address)).lt("2750000000000000000");

    let tndAmount = await tnd.balanceOf(user0.address);
    expect(await vester.balanceOf(user0.address)).eq(
      expandDecimals(1000, 18).sub(tndAmount)
    );

    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimedAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await increaseTime(provider, 48 * 60 * 60);
    await mineBlock(provider);

    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimedAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimable(user0.address)).gt("5478000000000000000"); // 1000 / 365 * 2 => ~5.479
    expect(await vester.claimable(user0.address)).lt("5480000000000000000");

    await increaseTime(provider, parseInt(365 / 2 - 1) * 24 * 60 * 60);
    await mineBlock(provider);

    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimedAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimable(user0.address)).gt(expandDecimals(500, 18)); // 1000 / 2 => 500
    expect(await vester.claimable(user0.address)).lt(expandDecimals(502, 18));

    await vester.connect(user0).claim();
    blockTime = await getBlockTime(provider);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).gt(expandDecimals(503, 18));
    expect(await tnd.balanceOf(user0.address)).lt(expandDecimals(505, 18));

    tndAmount = await tnd.balanceOf(user0.address);
    expect(await vester.balanceOf(user0.address)).eq(
      expandDecimals(1000, 18).sub(tndAmount)
    );

    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimedAmounts(user0.address)).eq(tndAmount);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    // vesting rate should be the same even after claiming
    expect(await vester.claimable(user0.address)).gt("2730000000000000000"); // 1000 / 365 => ~2.739
    expect(await vester.claimable(user0.address)).lt("2750000000000000000");

    await esTnd.mint(user0.address, expandDecimals(500, 18));
    await esTnd.connect(user0).approve(vester.address, expandDecimals(500, 18));
    await vester.connect(user0).deposit(expandDecimals(500, 18));

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await vester.claimable(user0.address)).gt("6840000000000000000"); // 1000 / 365 + 1500 / 365 => 6.849
    expect(await vester.claimable(user0.address)).lt("6860000000000000000");

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).eq(tndAmount);

    await vester.connect(user0).withdraw();

    expect(await esTnd.balanceOf(user0.address)).gt(expandDecimals(989, 18));
    expect(await esTnd.balanceOf(user0.address)).lt(expandDecimals(990, 18));
    expect(await tnd.balanceOf(user0.address)).gt(expandDecimals(510, 18));
    expect(await tnd.balanceOf(user0.address)).lt(expandDecimals(512, 18));

    expect(await vester.balanceOf(user0.address)).eq(0);
    expect(await vester.getTotalVested(user0.address)).eq(0);
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(0);

    await esTnd
      .connect(user0)
      .approve(vester.address, expandDecimals(1000, 18));
    await esTnd.mint(user0.address, expandDecimals(1000, 18));
    await vester.connect(user0).deposit(expandDecimals(1000, 18));
    blockTime = await getBlockTime(provider);

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).gt("2730000000000000000"); // 1000 / 365 => ~2.739
    expect(await vester.claimable(user0.address)).lt("2750000000000000000");
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await vester.connect(user0).claim();
  });

  it("depositForAccount, claimForAccount", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);
    await esTnd.setMinter(vester.address, true);
    await vester.setHandler(wallet.address, true);

    await esTnd
      .connect(user0)
      .approve(vester.address, expandDecimals(1000, 18));

    expect(await vester.balanceOf(user0.address)).eq(0);
    expect(await vester.getTotalVested(user0.address)).eq(0);
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(0);

    await esTnd.mint(user0.address, expandDecimals(1000, 18));

    await expect(
      vester
        .connect(user2)
        .depositForAccount(user0.address, expandDecimals(1000, 18))
    ).to.be.revertedWith("Vester: forbidden");

    await vester.setHandler(user2.address, true);
    await vester
      .connect(user2)
      .depositForAccount(user0.address, expandDecimals(1000, 18));

    let blockTime = await getBlockTime(provider);

    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).eq(0);
    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).gt("2730000000000000000"); // 1000 / 365 => ~2.739
    expect(await vester.claimable(user0.address)).lt("2750000000000000000");
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await expect(vester.connect(user0).claim()).to.be.revertedWith(
      "BaseToken: transfer amount exceeds balance"
    );

    await tnd.mint(vester.address, expandDecimals(2000, 18));

    await expect(
      vester.connect(user3).claimForAccount(user0.address, user4.address)
    ).to.be.revertedWith("Vester: forbidden");

    await vester.setHandler(user3.address, true);

    await vester.connect(user3).claimForAccount(user0.address, user4.address);
    blockTime = await getBlockTime(provider);

    expect(await esTnd.balanceOf(user4.address)).eq(0);
    expect(await tnd.balanceOf(user4.address)).gt("2730000000000000000");
    expect(await tnd.balanceOf(user4.address)).lt("2750000000000000000");

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).eq(0);
    expect(await vester.balanceOf(user0.address)).gt(expandDecimals(996, 18));
    expect(await vester.balanceOf(user0.address)).lt(expandDecimals(998, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).gt(
      "2730000000000000000"
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).lt(
      "2750000000000000000"
    );
    expect(await vester.claimedAmounts(user0.address)).gt(
      "2730000000000000000"
    );
    expect(await vester.claimedAmounts(user0.address)).lt(
      "2750000000000000000"
    );
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);
  });

  it("handles multiple deposits", async () => {
    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      AddressZero,
      tnd.address,
      AddressZero,
    ]);
    await esTnd.setMinter(vester.address, true);
    await vester.setHandler(wallet.address, true);

    await esTnd
      .connect(user0)
      .approve(vester.address, expandDecimals(1000, 18));

    expect(await vester.balanceOf(user0.address)).eq(0);
    expect(await vester.getTotalVested(user0.address)).eq(0);
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(0);

    await esTnd.mint(user0.address, expandDecimals(1000, 18));
    await vester.connect(user0).deposit(expandDecimals(1000, 18));

    let blockTime = await getBlockTime(provider);

    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await tnd.balanceOf(user0.address)).eq(0);
    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0);
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).gt("2730000000000000000"); // 1000 / 365 => ~2.739
    expect(await vester.claimable(user0.address)).lt("2750000000000000000");
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await expect(vester.connect(user0).claim()).to.be.revertedWith(
      "BaseToken: transfer amount exceeds balance"
    );

    await tnd.mint(vester.address, expandDecimals(2000, 18));

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await vester.balanceOf(user0.address)).eq(expandDecimals(1000, 18));

    await esTnd.mint(user0.address, expandDecimals(500, 18));
    await esTnd.connect(user0).approve(vester.address, expandDecimals(500, 18));
    await vester.connect(user0).deposit(expandDecimals(500, 18));
    blockTime = await getBlockTime(provider);

    expect(await vester.balanceOf(user0.address)).gt(expandDecimals(1494, 18));
    expect(await vester.balanceOf(user0.address)).lt(expandDecimals(1496, 18));
    expect(await vester.getTotalVested(user0.address)).eq(
      expandDecimals(1500, 18)
    );
    expect(await vester.cumulativeClaimAmounts(user0.address)).gt(
      "5470000000000000000"
    ); // 5.47, 1000 / 365 * 2 => ~5.48
    expect(await vester.cumulativeClaimAmounts(user0.address)).lt(
      "5490000000000000000"
    ); // 5.49
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).gt("5470000000000000000");
    expect(await vester.claimable(user0.address)).lt("5490000000000000000");
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(blockTime);

    await vester.connect(user0).withdraw();

    expect(await esTnd.balanceOf(user0.address)).gt(expandDecimals(1494, 18));
    expect(await esTnd.balanceOf(user0.address)).lt(expandDecimals(1496, 18));
    expect(await tnd.balanceOf(user0.address)).gt("5470000000000000000");
    expect(await tnd.balanceOf(user0.address)).lt("5490000000000000000");
    expect(await vester.balanceOf(user0.address)).eq(0);
    expect(await vester.getTotalVested(user0.address)).eq(0);
    expect(await vester.cumulativeClaimAmounts(user0.address)).eq(0); // 5.47, 1000 / 365 * 2 => ~5.48
    expect(await vester.claimedAmounts(user0.address)).eq(0);
    expect(await vester.claimable(user0.address)).eq(0);
    expect(await vester.pairAmounts(user0.address)).eq(0);
    expect(await vester.lastVestingTimes(user0.address)).eq(0);
  });

  it("handles pairing", async () => {
    stakedTndTracker = await deployContract("RewardTracker", [
      "Staked TND",
      "sTND",
    ]);
    stakedTndDistributor = await deployContract("RewardDistributor", [
      esTnd.address,
      stakedTndTracker.address,
    ]);
    await stakedTndTracker.initialize(
      [tnd.address, esTnd.address],
      stakedTndDistributor.address
    );
    await stakedTndDistributor.updateLastDistributionTime();

    bonusTndTracker = await deployContract("RewardTracker", [
      "Staked + Bonus TND",
      "sbTND",
    ]);
    bonusTndDistributor = await deployContract("BonusDistributor", [
      bnTnd.address,
      bonusTndTracker.address,
    ]);
    await bonusTndTracker.initialize(
      [stakedTndTracker.address],
      bonusTndDistributor.address
    );
    await bonusTndDistributor.updateLastDistributionTime();

    feeTndTracker = await deployContract("RewardTracker", [
      "Staked + Bonus + Fee TND",
      "sbfTND",
    ]);
    feeTndDistributor = await deployContract("RewardDistributor", [
      eth.address,
      feeTndTracker.address,
    ]);
    await feeTndTracker.initialize(
      [bonusTndTracker.address, bnTnd.address],
      feeTndDistributor.address
    );
    await feeTndDistributor.updateLastDistributionTime();

    await stakedTndTracker.setInPrivateTransferMode(true);
    await stakedTndTracker.setInPrivateStakingMode(true);
    await bonusTndTracker.setInPrivateTransferMode(true);
    await bonusTndTracker.setInPrivateStakingMode(true);
    await bonusTndTracker.setInPrivateClaimingMode(true);
    await feeTndTracker.setInPrivateTransferMode(true);
    await feeTndTracker.setInPrivateStakingMode(true);

    await esTnd.setMinter(wallet.address, true);
    await esTnd.mint(
      stakedTndDistributor.address,
      expandDecimals(50000 * 12, 18)
    );
    await stakedTndDistributor.setTokensPerInterval("20667989410000000"); // 0.02066798941 esTnd per second

    const rewardRouter = await deployContract("RewardRouterV2", []);
    await rewardRouter.initialize(
      eth.address,
      tnd.address,
      esTnd.address,
      bnTnd.address,
      stakedTndTracker.address,
      bonusTndTracker.address,
      feeTndTracker.address,
      AddressZero
    );

    // allow rewardRouter to stake in stakedTndTracker
    await stakedTndTracker.setHandler(rewardRouter.address, true);
    // allow bonusTndTracker to stake stakedTndTracker
    await stakedTndTracker.setHandler(bonusTndTracker.address, true);
    // allow rewardRouter to stake in bonusTndTracker
    await bonusTndTracker.setHandler(rewardRouter.address, true);
    // allow bonusTndTracker to stake feeTndTracker
    await bonusTndTracker.setHandler(feeTndTracker.address, true);
    await bonusTndDistributor.setBonusMultiplier(10000);
    // allow rewardRouter to stake in feeTndTracker
    await feeTndTracker.setHandler(rewardRouter.address, true);
    // allow stakedTndTracker to stake esTnd
    await esTnd.setHandler(stakedTndTracker.address, true);
    // allow feeTndTracker to stake bnTnd
    await bnTnd.setHandler(feeTndTracker.address, true);
    // allow rewardRouter to burn bnTnd
    await bnTnd.setMinter(rewardRouter.address, true);

    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      feeTndTracker.address,
      tnd.address,
      stakedTndTracker.address,
    ]);
    await esTnd.setMinter(vester.address, true);
    await vester.setHandler(wallet.address, true);

    expect(await vester.name()).eq("Vested TND");
    expect(await vester.symbol()).eq("veTND");
    expect(await vester.vestingDuration()).eq(secondsPerYear);
    expect(await vester.esToken()).eq(esTnd.address);
    expect(await vester.pairToken()).eq(feeTndTracker.address);
    expect(await vester.claimableToken()).eq(tnd.address);
    expect(await vester.rewardTracker()).eq(stakedTndTracker.address);
    expect(await vester.hasPairToken()).eq(true);
    expect(await vester.hasRewardTracker()).eq(true);
    expect(await vester.hasMaxVestableAmount()).eq(true);

    // allow vester to transfer feeTndTracker tokens
    await feeTndTracker.setHandler(vester.address, true);
    // allow vester to transfer esTnd tokens
    await esTnd.setHandler(vester.address, true);

    await tnd.mint(vester.address, expandDecimals(2000, 18));

    await tnd.mint(user0.address, expandDecimals(1000, 18));
    await tnd.mint(user1.address, expandDecimals(500, 18));
    await tnd
      .connect(user0)
      .approve(stakedTndTracker.address, expandDecimals(1000, 18));
    await tnd
      .connect(user1)
      .approve(stakedTndTracker.address, expandDecimals(500, 18));

    await rewardRouter.connect(user0).stakeTnd(expandDecimals(1000, 18));
    await rewardRouter.connect(user1).stakeTnd(expandDecimals(500, 18));

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await stakedTndTracker.claimable(user0.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await stakedTndTracker.claimable(user0.address)).lt(
      expandDecimals(1191, 18)
    );
    expect(await stakedTndTracker.claimable(user1.address)).gt(
      expandDecimals(594, 18)
    );
    expect(await stakedTndTracker.claimable(user1.address)).lt(
      expandDecimals(596, 18)
    );

    expect(await vester.getMaxVestableAmount(user0.address)).eq(0);
    expect(await vester.getMaxVestableAmount(user1.address)).eq(0);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await esTnd.balanceOf(user1.address)).eq(0);
    expect(await esTnd.balanceOf(user2.address)).eq(0);
    expect(await esTnd.balanceOf(user3.address)).eq(0);

    await stakedTndTracker.connect(user0).claim(user2.address);
    await stakedTndTracker.connect(user1).claim(user3.address);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await esTnd.balanceOf(user1.address)).eq(0);
    expect(await esTnd.balanceOf(user2.address)).gt(expandDecimals(1190, 18));
    expect(await esTnd.balanceOf(user2.address)).lt(expandDecimals(1191, 18));
    expect(await esTnd.balanceOf(user3.address)).gt(expandDecimals(594, 18));
    expect(await esTnd.balanceOf(user3.address)).lt(expandDecimals(596, 18));

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(1191, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).gt(
      expandDecimals(594, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).lt(
      expandDecimals(596, 18)
    );
    expect(await vester.getMaxVestableAmount(user2.address)).eq(0);
    expect(await vester.getMaxVestableAmount(user3.address)).eq(0);

    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).gt(
      "830000000000000000"
    ); // 0.83, 1000 / 1190 => ~0.84
    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).lt(
      "850000000000000000"
    ); // 0.85
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).gt(
      "830000000000000000"
    ); // 0.83, 500 / 595 => ~0.84
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).lt(
      "850000000000000000"
    ); // 0.85
    expect(await vester.getPairAmount(user2.address, expandDecimals(1, 18))).eq(
      0
    );
    expect(await vester.getPairAmount(user3.address, expandDecimals(1, 18))).eq(
      0
    );

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    await stakedTndTracker.connect(user0).claim(user2.address);
    await stakedTndTracker.connect(user1).claim(user3.address);

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(2380, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(2382, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).gt(
      expandDecimals(1189, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).lt(
      expandDecimals(1191, 18)
    );

    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).gt(
      "410000000000000000"
    ); // 0.41, 1000 / 2380 => ~0.42
    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).lt(
      "430000000000000000"
    ); // 0.43
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).gt(
      "410000000000000000"
    ); // 0.41, 1000 / 2380 => ~0.42
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).lt(
      "430000000000000000"
    ); // 0.43

    await esTnd.mint(user0.address, expandDecimals(2385, 18));
    await expect(
      vester.connect(user0).deposit(expandDecimals(2385, 18))
    ).to.be.revertedWith("RewardTracker: transfer amount exceeds balance");

    await tnd.mint(user0.address, expandDecimals(500, 18));
    await tnd
      .connect(user0)
      .approve(stakedTndTracker.address, expandDecimals(500, 18));
    await rewardRouter.connect(user0).stakeTnd(expandDecimals(500, 18));

    await expect(
      vester.connect(user0).deposit(expandDecimals(2385, 18))
    ).to.be.revertedWith("Vester: max vestable amount exceeded");

    await tnd.mint(user2.address, expandDecimals(1, 18));
    await expect(
      vester.connect(user2).deposit(expandDecimals(1, 18))
    ).to.be.revertedWith("Vester: max vestable amount exceeded");

    expect(await esTnd.balanceOf(user0.address)).eq(expandDecimals(2385, 18));
    expect(await esTnd.balanceOf(vester.address)).eq(0);
    expect(await feeTndTracker.balanceOf(user0.address)).eq(
      expandDecimals(1500, 18)
    );
    expect(await feeTndTracker.balanceOf(vester.address)).eq(0);

    await vester.connect(user0).deposit(expandDecimals(2380, 18));

    expect(await esTnd.balanceOf(user0.address)).eq(expandDecimals(5, 18));
    expect(await esTnd.balanceOf(vester.address)).eq(expandDecimals(2380, 18));
    expect(await feeTndTracker.balanceOf(user0.address)).gt(
      expandDecimals(499, 18)
    );
    expect(await feeTndTracker.balanceOf(user0.address)).lt(
      expandDecimals(501, 18)
    );
    expect(await feeTndTracker.balanceOf(vester.address)).gt(
      expandDecimals(999, 18)
    );
    expect(await feeTndTracker.balanceOf(vester.address)).lt(
      expandDecimals(1001, 18)
    );

    await rewardRouter.connect(user1).unstakeTnd(expandDecimals(499, 18));

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    await stakedTndTracker.connect(user0).claim(user2.address);
    await stakedTndTracker.connect(user1).claim(user3.address);

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(4164, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(4166, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).lt(
      expandDecimals(1192, 18)
    );

    // (1000 * 2380 / 4164) + (1500 * 1784 / 4164) => 1214.21709894
    // 1214.21709894 / 4164 => ~0.29

    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).gt(
      "280000000000000000"
    ); // 0.28
    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).lt(
      "300000000000000000"
    ); // 0.30
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).gt(
      "410000000000000000"
    ); // 0.41, 1000 / 2380 => ~0.42
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).lt(
      "430000000000000000"
    ); // 0.43

    await increaseTime(provider, 30 * 24 * 60 * 60);
    await mineBlock(provider);

    await vester.connect(user0).withdraw();

    expect(await feeTndTracker.balanceOf(user0.address)).eq(
      expandDecimals(1500, 18)
    );
    expect(await tnd.balanceOf(user0.address)).gt(expandDecimals(201, 18)); // 2380 / 12 = ~198
    expect(await tnd.balanceOf(user0.address)).lt(expandDecimals(203, 18));
    expect(await esTnd.balanceOf(user0.address)).gt(expandDecimals(2182, 18)); // 5 + 2380 - 202  = 2183
    expect(await esTnd.balanceOf(user0.address)).lt(expandDecimals(2183, 18));
  });

  it("handles existing pair tokens", async () => {
    stakedTndTracker = await deployContract("RewardTracker", [
      "Staked TND",
      "sTND",
    ]);
    stakedTndDistributor = await deployContract("RewardDistributor", [
      esTnd.address,
      stakedTndTracker.address,
    ]);
    await stakedTndTracker.initialize(
      [tnd.address, esTnd.address],
      stakedTndDistributor.address
    );
    await stakedTndDistributor.updateLastDistributionTime();

    bonusTndTracker = await deployContract("RewardTracker", [
      "Staked + Bonus TND",
      "sbTND",
    ]);
    bonusTndDistributor = await deployContract("BonusDistributor", [
      bnTnd.address,
      bonusTndTracker.address,
    ]);
    await bonusTndTracker.initialize(
      [stakedTndTracker.address],
      bonusTndDistributor.address
    );
    await bonusTndDistributor.updateLastDistributionTime();

    feeTndTracker = await deployContract("RewardTracker", [
      "Staked + Bonus + Fee TND",
      "sbfTND",
    ]);
    feeTndDistributor = await deployContract("RewardDistributor", [
      eth.address,
      feeTndTracker.address,
    ]);
    await feeTndTracker.initialize(
      [bonusTndTracker.address, bnTnd.address],
      feeTndDistributor.address
    );
    await feeTndDistributor.updateLastDistributionTime();

    await stakedTndTracker.setInPrivateTransferMode(true);
    await stakedTndTracker.setInPrivateStakingMode(true);
    await bonusTndTracker.setInPrivateTransferMode(true);
    await bonusTndTracker.setInPrivateStakingMode(true);
    await bonusTndTracker.setInPrivateClaimingMode(true);
    await feeTndTracker.setInPrivateTransferMode(true);
    await feeTndTracker.setInPrivateStakingMode(true);

    await esTnd.setMinter(wallet.address, true);
    await esTnd.mint(
      stakedTndDistributor.address,
      expandDecimals(50000 * 12, 18)
    );
    await stakedTndDistributor.setTokensPerInterval("20667989410000000"); // 0.02066798941 esTnd per second

    const rewardRouter = await deployContract("RewardRouterV2", []);
    await rewardRouter.initialize(
      eth.address,
      tnd.address,
      esTnd.address,
      bnTnd.address,
      stakedTndTracker.address,
      bonusTndTracker.address,
      feeTndTracker.address,
      AddressZero
    );

    // allow rewardRouter to stake in stakedTndTracker
    await stakedTndTracker.setHandler(rewardRouter.address, true);
    // allow bonusTndTracker to stake stakedTndTracker
    await stakedTndTracker.setHandler(bonusTndTracker.address, true);
    // allow rewardRouter to stake in bonusTndTracker
    await bonusTndTracker.setHandler(rewardRouter.address, true);
    // allow bonusTndTracker to stake feeTndTracker
    await bonusTndTracker.setHandler(feeTndTracker.address, true);
    await bonusTndDistributor.setBonusMultiplier(10000);
    // allow rewardRouter to stake in feeTndTracker
    await feeTndTracker.setHandler(rewardRouter.address, true);
    // allow stakedTndTracker to stake esTnd
    await esTnd.setHandler(stakedTndTracker.address, true);
    // allow feeTndTracker to stake bnTnd
    await bnTnd.setHandler(feeTndTracker.address, true);
    // allow rewardRouter to burn bnTnd
    await bnTnd.setMinter(rewardRouter.address, true);

    const vester = await deployContract("Vester", [
      "Vested TND",
      "veTND",
      secondsPerYear,
      esTnd.address,
      feeTndTracker.address,
      tnd.address,
      stakedTndTracker.address,
    ]);
    await esTnd.setMinter(vester.address, true);
    await vester.setHandler(wallet.address, true);

    expect(await vester.name()).eq("Vested TND");
    expect(await vester.symbol()).eq("veTND");
    expect(await vester.vestingDuration()).eq(secondsPerYear);
    expect(await vester.esToken()).eq(esTnd.address);
    expect(await vester.pairToken()).eq(feeTndTracker.address);
    expect(await vester.claimableToken()).eq(tnd.address);
    expect(await vester.rewardTracker()).eq(stakedTndTracker.address);
    expect(await vester.hasPairToken()).eq(true);
    expect(await vester.hasRewardTracker()).eq(true);
    expect(await vester.hasMaxVestableAmount()).eq(true);

    // allow vester to transfer feeTndTracker tokens
    await feeTndTracker.setHandler(vester.address, true);
    // allow vester to transfer esTnd tokens
    await esTnd.setHandler(vester.address, true);

    await tnd.mint(vester.address, expandDecimals(2000, 18));

    await tnd.mint(user0.address, expandDecimals(1000, 18));
    await tnd.mint(user1.address, expandDecimals(500, 18));
    await tnd
      .connect(user0)
      .approve(stakedTndTracker.address, expandDecimals(1000, 18));
    await tnd
      .connect(user1)
      .approve(stakedTndTracker.address, expandDecimals(500, 18));

    await rewardRouter.connect(user0).stakeTnd(expandDecimals(1000, 18));
    await rewardRouter.connect(user1).stakeTnd(expandDecimals(500, 18));

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await stakedTndTracker.claimable(user0.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await stakedTndTracker.claimable(user0.address)).lt(
      expandDecimals(1191, 18)
    );
    expect(await stakedTndTracker.claimable(user1.address)).gt(
      expandDecimals(594, 18)
    );
    expect(await stakedTndTracker.claimable(user1.address)).lt(
      expandDecimals(596, 18)
    );

    expect(await vester.getMaxVestableAmount(user0.address)).eq(0);
    expect(await vester.getMaxVestableAmount(user1.address)).eq(0);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await esTnd.balanceOf(user1.address)).eq(0);
    expect(await esTnd.balanceOf(user2.address)).eq(0);
    expect(await esTnd.balanceOf(user3.address)).eq(0);

    await stakedTndTracker.connect(user0).claim(user2.address);
    await stakedTndTracker.connect(user1).claim(user3.address);

    expect(await esTnd.balanceOf(user0.address)).eq(0);
    expect(await esTnd.balanceOf(user1.address)).eq(0);
    expect(await esTnd.balanceOf(user2.address)).gt(expandDecimals(1190, 18));
    expect(await esTnd.balanceOf(user2.address)).lt(expandDecimals(1191, 18));
    expect(await esTnd.balanceOf(user3.address)).gt(expandDecimals(594, 18));
    expect(await esTnd.balanceOf(user3.address)).lt(expandDecimals(596, 18));

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(1191, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).gt(
      expandDecimals(594, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).lt(
      expandDecimals(596, 18)
    );
    expect(await vester.getMaxVestableAmount(user2.address)).eq(0);
    expect(await vester.getMaxVestableAmount(user3.address)).eq(0);

    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).gt(
      "830000000000000000"
    ); // 0.83, 1000 / 1190 => ~0.84
    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).lt(
      "850000000000000000"
    ); // 0.85
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).gt(
      "830000000000000000"
    ); // 0.83, 500 / 595 => ~0.84
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).lt(
      "850000000000000000"
    ); // 0.85
    expect(await vester.getPairAmount(user2.address, expandDecimals(1, 18))).eq(
      0
    );
    expect(await vester.getPairAmount(user3.address, expandDecimals(1, 18))).eq(
      0
    );

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    await stakedTndTracker.connect(user0).claim(user2.address);
    await stakedTndTracker.connect(user1).claim(user3.address);

    expect(await esTnd.balanceOf(user2.address)).gt(expandDecimals(2380, 18));
    expect(await esTnd.balanceOf(user2.address)).lt(expandDecimals(2382, 18));
    expect(await esTnd.balanceOf(user3.address)).gt(expandDecimals(1189, 18));
    expect(await esTnd.balanceOf(user3.address)).lt(expandDecimals(1191, 18));

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(2380, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(2382, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).gt(
      expandDecimals(1189, 18)
    );
    expect(await vester.getMaxVestableAmount(user1.address)).lt(
      expandDecimals(1191, 18)
    );

    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).gt(
      "410000000000000000"
    ); // 0.41, 1000 / 2380 => ~0.42
    expect(await vester.getPairAmount(user0.address, expandDecimals(1, 18))).lt(
      "430000000000000000"
    ); // 0.43
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).gt(
      "410000000000000000"
    ); // 0.41, 1000 / 2380 => ~0.42
    expect(await vester.getPairAmount(user1.address, expandDecimals(1, 18))).lt(
      "430000000000000000"
    ); // 0.43

    expect(
      await vester.getPairAmount(user0.address, expandDecimals(2380, 18))
    ).gt(expandDecimals(999, 18));
    expect(
      await vester.getPairAmount(user0.address, expandDecimals(2380, 18))
    ).lt(expandDecimals(1000, 18));
    expect(
      await vester.getPairAmount(user1.address, expandDecimals(1189, 18))
    ).gt(expandDecimals(499, 18));
    expect(
      await vester.getPairAmount(user1.address, expandDecimals(1189, 18))
    ).lt(expandDecimals(500, 18));

    expect(await feeTndTracker.balanceOf(user0.address)).eq(
      expandDecimals(1000, 18)
    );
    await esTnd.mint(user0.address, expandDecimals(2380, 18));
    await vester.connect(user0).deposit(expandDecimals(2380, 18));

    expect(await feeTndTracker.balanceOf(user0.address)).gt(0);
    expect(await feeTndTracker.balanceOf(user0.address)).lt(
      expandDecimals(1, 18)
    );

    await increaseTime(provider, 24 * 60 * 60);
    await mineBlock(provider);

    expect(await stakedTndTracker.claimable(user0.address)).gt(
      expandDecimals(1190, 18)
    );
    expect(await stakedTndTracker.claimable(user0.address)).lt(
      expandDecimals(1191, 18)
    );

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(2380, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(2382, 18)
    );

    await stakedTndTracker.connect(user0).claim(user2.address);

    expect(await vester.getMaxVestableAmount(user0.address)).gt(
      expandDecimals(3571, 18)
    );
    expect(await vester.getMaxVestableAmount(user0.address)).lt(
      expandDecimals(3572, 18)
    );

    expect(
      await vester.getPairAmount(user0.address, expandDecimals(3570, 18))
    ).gt(expandDecimals(999, 18));
    expect(
      await vester.getPairAmount(user0.address, expandDecimals(3570, 18))
    ).lt(expandDecimals(1000, 18));

    const feeTndTrackerBalance = await feeTndTracker.balanceOf(user0.address);

    await esTnd.mint(user0.address, expandDecimals(1190, 18));
    await vester.connect(user0).deposit(expandDecimals(1190, 18));

    expect(feeTndTrackerBalance).eq(
      await feeTndTracker.balanceOf(user0.address)
    );

    await expect(
      rewardRouter.connect(user0).unstakeTnd(expandDecimals(2, 18))
    ).to.be.revertedWith("RewardTracker: burn amount exceeds balance");

    await vester.connect(user0).withdraw();

    await rewardRouter.connect(user0).unstakeTnd(expandDecimals(2, 18));
  });
});
