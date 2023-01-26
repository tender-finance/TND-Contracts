import "@nomiclabs/hardhat-ethers"
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
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
  amount: fa('200000', 18)    // 200k
};
const depositToVest = async (lockingContract: Contract, tndContract: Contract) => {
  const { admin, wallet } = await getSigners();
  await lockingContract.connect(admin).deposit(vestAmount);
  // await tndContract.transfer(lockingContract.address, fa('200000', 18));
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

  await ethDistributor.setTokensPerInterval(fa('.01', 18));
  await esTndDistributor.setTokensPerInterval(fa('.01', 18));

  await depositToVest(lockingContract, tndContract)

  const releaseMaxAmount = async () => {
    console.log('Beneficiary Balance Before release:', await tndContract.balanceOf(beneficiary))
    const id = await lockingContract.computeVestingScheduleIdForAddressAndIndex(beneficiary, 0);
    const amount = await lockingContract.computeReleasableAmount(id)
    await lockingContract.connect(wallet).release(id, amount);
    console.log('Beneficiary Balance After release:', await tndContract.balanceOf(beneficiary))
  }

  const claimEarned = async () => {
    const id = await lockingContract.computeVestingScheduleIdForAddressAndIndex(beneficiary, 0);
    await lockingContract.connect(wallet).claimAndRetrieveRewards(id);
  }

  const testRelease = async (waitInMonths: number) => {
    console.log(`Release with waitInMonths wait:`);
    await hre.network.provider.send('hardhat_mine', [hex(waitInMonths)]);
    await releaseMaxAmount();
  }

  console.log('EsTnd in Wallet Before Claim:', await esTnd.balanceOf(wallet.address));
  console.log('sbfTnd in Lock Before Claim:', await sbfTndContract.balanceOf(lockingContract.address));
  console.log('Eth in Wallet Before Claim:', await wEth.balanceOf(wallet.address));
  console.log(`Claim rewards with waitInMonths wait:`);
  await hre.network.provider.send('hardhat_mine', [hex(month*2)]);
  console.log('claimable weth balance:', await sbfTndContract.claimable(lockingContract.address))
  await claimEarned();
  console.log(await ethers.provider.getBalance(lockingContract.address))
  console.log('EsTnd in Wallet After Claim:', await esTnd.balanceOf(wallet.address));
  console.log('sbfTnd in Lock After Claim:', await sbfTndContract.balanceOf(lockingContract.address));
  console.log('claimable weth balance:', await sbfTndContract.claimable(lockingContract.address))
  console.log('wEth in Wallet After Claim:', await wEth.balanceOf(wallet.address));
  // await testRelease(month*4);


  // const vestBaseFixture = async () => { await vest(admin, wallet, lockingContract, tndContract) }
  // loadFixture(vestBaseFixture)

  // await fundWithEth(ethDistributor)
  // await loadFixture(vestBaseFixture)
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
