import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan'
import hre, { ethers } from 'hardhat';
import {
  setMinter,
  deployUpgradable,
  setHandler,
  formatAmount,
  fundWithEth
} from '../utils/helpers';
import { adminAddress, multisigAddress, SECONDS_PER_DAY, CONTRACTS as c } from '../utils/constants';

const netName = hre.network.name;
const getSigner = async () => {
  if(netName == 'hardhat') {
    const signer = await ethers.getImpersonatedSigner(adminAddress);
    const [ethWallet] = await ethers.getSigners();
    await ethWallet.sendTransaction({
      to: signer.address,
      value: ethers.utils.parseEther("1.0"),
    });
    return signer
  }
  const [signer] = await ethers.getSigners();
  return signer;
}
const verifyProxy = async (name: string, address: string) => {
  if (netName == 'hardhat') { return };
  console.log(`Verifying ${name}:`, address)
  try {
    await hre.run('verify:verify', { address: address, })
  } catch (e) {
    console.log('Verification failed for', name, address)
    console.log(e)
  }
}

// vester needs:
// handler: sbfTND, esTND
// minter: esTND
async function deployVester(signer: any) {
  const args = [
    "Vested TND",
    "vTND",
    SECONDS_PER_DAY * 365,
    c.esTND.address,
    c.sbfTND.address,
    c.TND.address,
    c.sTND.address
  ];
  console.log('deploying vester with args:', args)
  const vester = await deployUpgradable('contracts/staking/VesterV2.sol:VesterV2', args, signer);
  console.log('deployed vester to address:', vester.address)
  await verifyProxy('vester', vester.address);
  return vester
}

async function deployRewardRouter (vester: any, signer: any) {
  const RewardRouter = await ethers.getContractFactory('contracts/staking/RewardRouterV2.sol:RewardRouterV2', signer);
  const rewardRouter = await RewardRouter.deploy();
  if (netName != 'hardhat') {
    await hre.run('verify:verify', {
      contract: 'contracts/staking/RewardRouterV2.sol:RewardRouterV2',
      address: rewardRouter.address,
      arguments: []
    })
  }
  await rewardRouter.connect(signer).initialize(
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    c.TND.address,
    c.esTND.address,
    c.bnTND.address,
    c.sTND.address,
    c.sbTND.address,
    c.sbfTND.address,
    vester.address,
    '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
  )
  // const rewardRouter = await deployUpgradable('RewardRouterV2', args, signer);
  // await verifyProxy('rewardRouter', rewardRouter.address);
  console.log('deployed rewardRouter to address:', rewardRouter.address);
  return rewardRouter;
}

// TODO: Verify fn for burner
async function deployBurner(signer: any) {
  console.log('deploying burner')
  const Burner = await ethers.getContractFactory('Burner', signer);
  const burner = await Burner.deploy();

  if (netName != 'hardhat') {
    await hre.run('verify:verify', {
      contract: 'contracts/staking/Burner.sol:Burner',
      address: burner.address,
      arguments: []
    })
  }
  return burner;
}
async function deployInstantVester (burner:any , signer: any) {
  console.log('burner deployed to address:', burner.address);
  const args = [
    c.esTND.address,        // depositToken
    c.TND.address,          // claimToken
    formatAmount(10, 16),   // claimWeight
    formatAmount(50,16),    // burnWeight
    multisigAddress,        // recievers
    formatAmount(40, 16),   // recieverWeights
    burner.address          // burner
  ]
  console.log('deploying instantVester:')
  const instantVester = await deployUpgradable('InstantVester', args, signer);
  console.log('instantVester deployed to address:', instantVester.address);
  await verifyProxy('instantVester', instantVester.address);
  return instantVester;
}

async function setPermissions(
  vesterAddress: string,
  rewardRouterAddress: string,
  burnerAddress: string,
  instantVesterAddress: string
) {
  const signer = await getSigner();
  const rewardRouter = await ethers.getContractAt('RewardRouterV2', rewardRouterAddress, signer);
  const vester = await ethers.getContractAt('VesterV2', vesterAddress, signer)
  const burner = await ethers.getContractAt('Burner', burnerAddress, signer)
  const instantVester = await ethers.getContractAt('InstantVester', instantVesterAddress, signer)

  await burner.connect(signer).setHandler(instantVester.address, true);
  await setHandler(instantVester.address, ['esTND'], signer);

  await setHandler(burner.address, ['esTND'], signer);
  await setMinter(burner.address, ['esTND'], signer);

  await setHandler(rewardRouter.address, ['sTND', 'bnTND', 'sbTND', 'sbfTND', 'esTND'], signer);
  await setMinter(rewardRouter.address, ['bnTND'], signer);

  await setHandler(vester.address, ['sbfTND', 'esTND'], signer);
  await setMinter(vester.address, ['esTND'], signer);

  await vester.connect(signer).setHandler(rewardRouter.address, true)
  console.log('permissions set')
}
async function deployVesting() {
  // const signer = await getSigner();
  const signer = await ethers.getImpersonatedSigner('0xFa7036b7c0EfB9FA66118CDA00db5c7685b9404f')
  await fundWithEth(signer.address)
  const vester = await deployVester(signer);
  const rewardRouter = await deployRewardRouter(vester, signer);
  const burner = await deployBurner(signer);
  const instantVester  = await deployInstantVester(burner, signer);
  return {
    vesterAddress: vester.address,
    rewardRouterAddress: rewardRouter.address,
    burnerAddress: burner.address,
    instantVesterAddress: instantVester.address
  }
}

deployVesting().then((addresses) => {
  setPermissions(
    addresses.vesterAddress,
    addresses.rewardRouterAddress,
    addresses.burnerAddress,
    addresses.instantVesterAddress)
});
