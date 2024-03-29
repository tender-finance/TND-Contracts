import { SECONDS_PER_DAY, CONTRACTS as c } from '../utils/constants';
import { ethers, BigNumberish } from '../imports';
import {
  deployUpgradable,
  setHandler,
  setMinter,
  getDeployment,
  formatAmount,
  fundWithEth,
  upgrade
} from '../utils/helpers'
import {
  adminAddress,
  multisigAddress,
} from '../utils/constants'
import { upgrades } from 'hardhat';

export async function setTokensPerInterval(contractName: string, newAmount: BigNumberish) {
  const admin = await ethers.getImpersonatedSigner(adminAddress);
  const c = await getDeployment(contractName);
  await c.connect(admin).setTokensPerInterval(newAmount);
  return
}

export function getVesterArgs() {
  return [
    "Vested TND",
    "vTND",
    SECONDS_PER_DAY * 365,
    c.esTND.address,
    c.sbfTND.address,
    c.TND.address,
    c.sTND.address
  ]
}


export function getRewardRouterArgs (vesterAddress: string) {
  const nativeToken = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // weth
  return [
    nativeToken,
    c.TND.address,
    c.esTND.address,
    c.bnTND.address,
    c.sTND.address,
    c.sbTND.address,
    c.sbfTND.address,
    vesterAddress
  ];
}
export async function deployRewardRouter (vesterAddress: any, signer: any) {
  const args = getRewardRouterArgs(vesterAddress);
  const rewardRouter = await deployUpgradable('RewardRouterV2', args, signer);
  await setHandler(rewardRouter.address, ['sTND', 'bnTND', 'sbTND', 'sbfTND', 'esTND'], signer);
  await setMinter(rewardRouter.address, ['bnTND', 'esTND'], signer);
  return rewardRouter;
}

export async function vestingFixture () {
  const admin = await ethers.getImpersonatedSigner(adminAddress);
  const multisig = await ethers.getImpersonatedSigner(multisigAddress);
  const [testWallet] = await ethers.getSigners()
  await fundWithEth(admin.address);
  await fundWithEth(multisig.address);

  // if (!vTND) {
  //   const args = getVesterArgs();
  //   vTND = await deployUpgradable('VesterV2', args, admin);
  //   await setHandler(vTND.address, ['sbfTND', 'esTND'], admin);
  //   await setMinter(vTND.address, ['esTND'], admin);
  // return vTND;
  // } else {
  const Vester = await ethers.getContractFactory('contracts/staking/VesterV2.sol:VesterV2', admin);
  let vTND = await upgrades.upgradeProxy('0xc5888f8D3663a6c27E4a2767a20C0CF347b2bb0e', Vester)
  const tnd = await getDeployment('TND');
  const esTND = await getDeployment('esTND');

  await tnd.connect(multisig).transfer(vTND.address, formatAmount(10000, 18))
  await tnd.connect(multisig).transfer(testWallet.address, formatAmount(1000, 18))
  await esTND.connect(admin).mint(testWallet.address, formatAmount(10000, 18))

  const rewardRouter = await getDeployment('RewardRouter');
  return { testWallet, vTND, rewardRouter };
}

export async function instantVestingFixture () {
  const admin = await ethers.getImpersonatedSigner(adminAddress);
  const multisig = await ethers.getImpersonatedSigner(multisigAddress);
  const [testWallet] = await ethers.getSigners()
  await fundWithEth(admin.address);
  await fundWithEth(multisig.address);
  const Burner = await ethers.getContractFactory('Burner', admin);
  const burner = await Burner.deploy();
  await setMinter(burner.address, ['esTND'], admin);
  await setMinter(burner.address, ['TND'], multisig);
  await setHandler(burner.address, ['esTND'], admin);

  const args = [
    c.esTND.address,        // depositToken
    c.TND.address,          // claimToken
    formatAmount(15, 16),   // claimWeight
    formatAmount(50,16),    // burnWeight
    multisig.address,       // recievers
    formatAmount(35, 16),   // recieverWeights
    burner.address          // burner
  ]
  const tnd = await getDeployment('TND');
  const esTND = await getDeployment('esTND');

  let instantVester = await getDeployment('InstantVester');
  if (!instantVester) {
    instantVester = await deployUpgradable('InstantVester', args, admin);
    await burner.connect(admin).setHandler(instantVester.address, true);
    await setHandler(instantVester.address, ['esTND'], admin);
  } else {
    const InstantVester = await ethers.getContractFactory('InstantVester', admin);
    await upgrades.upgradeProxy(instantVester.address, InstantVester)
  }

  await tnd.connect(multisig).transfer(instantVester.address, formatAmount(2000));
  await esTND.connect(multisig).mint(testWallet.address, formatAmount(1000, 18))
  return {
    instantVester,
    testWallet,
    admin,
    multisig,
  }
}
