import { SECONDS_PER_DAY, CONTRACTS as c } from '../utils/constants';
import { ethers } from 'hardhat';
import {
  deployUpgradable,
  setHandler,
  setMinter,
  getDeployment,
  formatAmount,
  fundWithEth
} from '../utils/helpers'
import {
  adminAddress,
  multisigAddress,
} from '../utils/constants'

export async function deployVester (signer: any) {
  const args = [
    "Vested TND",
    "vTND",
    SECONDS_PER_DAY * 365,
    c.esTND.address,
    c.sbfTND.address,
    c.TND.address,
    c.sTND.address
  ]
  const vester = await deployUpgradable('VesterV3', args, signer);
  await setHandler(vester.address, ['sTND', 'bnTND', 'sbTND', 'sbfTND', 'esTND'], signer);
  await setMinter(vester.address, ['bnTND', 'esTND'], signer);
  return vester;
}

export async function deployRewardRouter (vesterAddress: any, signer: any) {
  const nativeToken = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // weth
  const args = [
    nativeToken,
    c.TND.address,
    c.esTND.address,
    c.bnTND.address,
    c.sTND.address,
    c.sbTND.address,
    c.sbfTND.address,
    vesterAddress
  ];
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

  const vester = await deployVester(admin);
  const tnd = await getDeployment('TND');
  const esTND = await getDeployment('esTND');

  await tnd.connect(multisig).transfer(vester.address, formatAmount(10000, 18))
  await tnd.connect(multisig).transfer(testWallet.address, formatAmount(1000, 18))
  await esTND.connect(admin).mint(testWallet.address, formatAmount(10000, 18))

  const rewardRouter = await deployRewardRouter(vester.address, admin);
  return { testWallet, vester, rewardRouter };
}
