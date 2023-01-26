import "@nomiclabs/hardhat-ethers"
import hre, { ethers } from "hardhat"
import type { Signer, Contract } from "ethers"
import { formatAmount, fundWithEth, getContractInstances } from './util'
const hex = (n: number) => { return `0x${Math.floor(n).toString(16)}` }
const fa = formatAmount

const multisig ='0x80b54e18e5bb556c6503e1c6f2655749c9e41da2'
const beneficiary = '0xb16A50C92f9A6B4DbCCeBBEb165f1fC03f87A75C'
const month = 2629743
const vestAmount = fa('200000', 18)
const wEthWallet = '0x5D0aC389c669D6EFE3BA96B9878d8156f180C539'

const vestingArgs = {
  beneficiary: beneficiary,   // beneficiary
  start: 1672894800,          // jan 5th
  cliff: month*6,             // cliff july 5th
  duration: month*48,         // duration 48 months
  slice: 1,                   // slice period 1 second
  revokable: true,            // is revocable
  amount:  vestAmount         // 200k
};
const depositToVest = async (lockingContract: Contract, tndContract: Contract) => {
  const { admin } = await getSigners();
  await lockingContract.connect(admin).deposit(vestAmount);
  const tx = await lockingContract.createVestingSchedule(...Object.values(vestingArgs));
  await tx.wait();
  console.log('Vesting Schedule Created');
}

const getSigners = async () => {
  await Promise.all([fundWithEth(beneficiary), fundWithEth(multisig), fundWithEth(wEthWallet)]);
  return {
    admin: await ethers.getImpersonatedSigner(multisig),
    wallet: await ethers.getImpersonatedSigner(beneficiary),
    funder: await ethers.getImpersonatedSigner(wEthWallet)
  }
}

const main = async () => {
  const { admin, wallet, funder } = await getSigners();
  const {
    Tnd: tndContract,
    esTnd: esTnd,
    wEth: wEth,
    sbfTnd: sbfTndContract,
    RewardRouterV2: rewardRouter,
    RewardDistributorEth: ethDistributor,
    RewardDistributorEsTnd: esTndDistributor,
    sTnd: sTnd
  } = await getContractInstances(admin);

  const LockingContract = await ethers.getContractFactory('contracts/lock/TeamVester.sol:TokenVesting', admin)
  const lockingContract =  await LockingContract.deploy(tndContract.address)
  await tndContract.connect(admin).approve(lockingContract.address, fa(1, 26));
  await esTnd.setHandler(lockingContract.address, true);

  const balanceWEthHolder = await wEth.balanceOf(funder.address);
  await wEth.connect(funder).transfer(ethDistributor.address, balanceWEthHolder);
  console.log(await wEth.balanceOf(ethDistributor.address))

  await ethDistributor.setTokensPerInterval(fa('.00001', 18));
  await esTndDistributor.setTokensPerInterval(fa('.01', 18));

  await depositToVest(lockingContract, tndContract)
  const id = await lockingContract.computeVestingScheduleIdForAddressAndIndex(beneficiary, 0);

  const releaseMaxAmount = async () => {
    console.log('Beneficiary TND Balance Before release:', await tndContract.balanceOf(beneficiary))
    const id = await lockingContract.computeVestingScheduleIdForAddressAndIndex(beneficiary, 0);
    const amount = await lockingContract.computeReleasableAmount(id)
    await lockingContract.connect(wallet).unstake(id, amount);
    await lockingContract.connect(wallet).release(id, amount);
    console.log('Beneficiary TND Balance After release:', await tndContract.balanceOf(beneficiary))
  }

  const claimEarned = async () => {
    console.log('Claiming Rewards');
    await lockingContract.connect(wallet).claimAndRetrieveRewards(id);
  }
  const stakeAll = async () => {
    console.log('Staking Full Balance')
    await lockingContract.connect(wallet).stakeAll(id);
    let depositBalance = await sTnd.depositBalances(lockingContract.address, tndContract.address)
    console.log('Deposit Balance', depositBalance)
    await ethers.provider.send('hardhat_mine', [hex(month*6)]);
    releaseMaxAmount()
    depositBalance = await sTnd.depositBalances(lockingContract.address, tndContract.address)
    console.log('Deposit Balance', depositBalance)
  }
  const logRewardBalances = async (msg: string) => {
    return Promise.all([
      wEth.balanceOf(wallet.address),
      esTnd.balanceOf(wallet.address),
      sbfTndContract.balanceOf(lockingContract.address)
    ]).then(async ([wEthBalance, esTndBalance, sbfTndBalance]) => {
        console.log(`wEth ${msg}`, wEthBalance);
        console.log(`EsTnd ${msg}`, esTndBalance);
        console.log(`sbfTnd ${msg}`, sbfTndBalance);
    })
  }
  console.log('Staking Balances')
  await stakeAll()

  let monthSum = 0
  const fastForward = async (wait: number) => {
    console.log(`Release after ${monthSum + wait} month wait:`);
    await ethers.provider.send('hardhat_mine', [hex(month*wait)]);
    await logRewardBalances('Balance before Claim:');
    await claimEarned();
    await logRewardBalances('Balance after Claim:');
    monthSum += wait;
  }

  const getMonth = (n: number) => { return n - monthSum }
  await fastForward(getMonth(5))
  try {
    await releaseMaxAmount()
  } catch(_) { console.log('Successfully reverted') }
  await fastForward(getMonth(6));
  await releaseMaxAmount();

  let depositBalance = await sTnd.depositBalances(lockingContract.address, tndContract.address)
  console.log('Deposit Balance', depositBalance)
  console.log('unstaking all')
  await lockingContract.connect(admin).unstakeAll(id);

  await lockingContract.connect(admin).revoke(id);
  await fastForward(getMonth(10));
  console.log('revoking')
  try{
    await releaseMaxAmount();
    console.error('Beneficiary vest changed after revoke!!!!!')
  } catch(_) { console.log('Successfully reverted') }

  console.log('withdrawing')
  await lockingContract.connect(admin).withdraw(await tndContract.balanceOf(lockingContract.address));
  console.log('Admin balance after withdraw:', await tndContract.balanceOf(admin.address));
}
main()









  //   console.log('Release with 5 month wait:');
  //   await hre.network.provider.send('hardhat_mine', [hex(month*5)]);
  //   try { await releaseMaxAmount() } catch (_) { console.log('Successfully reverted') };
  //
  //   console.log('Release with 6 month wait:');
  //   await hre.network.provider.send('hardhat_mine', [hex(month*6)])
  //
  //   console.log('Release with 48 month wait:');
  //   await hre.network.provider.send('hardhat_mine', [hex(month*48)])
  //   await releaseMaxAmount();
  // }
  // await testRelease();
