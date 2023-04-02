import '@nomiclabs/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, {ethers, upgrades} from 'hardhat';
import * as c from './constants';
import {getImplementationAddress } from '@openzeppelin/upgrades-core';


const main = async () => {
  const [deployer] = await ethers.getSigners();
  console.log(deployer.address)
  // Deploying
  const UpgradableVester = await ethers.getContractFactory("contracts/staking/VesterV2.sol:VesterV2", deployer);

  // upgrades.deployProxy()
  const vester = await upgrades.deployProxy(UpgradableVester, [
    "Vested TND",
    "vTND",
    c.vestingDuration,
    c.esTNDAddress,
    c.sbfTNDAddress,
    c.tndAddress,
    c.sTNDAddress
  ])

  await vester.deployed();
  console.log(await vester.owner())

  const RewardRouter = await ethers.getContractFactory("RewardRouterV2", deployer);

  const rewardRouter = await upgrades.deployProxy(RewardRouter, [
    c.nativeTokenAddress,
    c.tndAddress,
    c.esTNDAddress,
    c.bnTNDAddress,
    c.sTNDAddress,
    c.sbTNDAddress,
    c.sbfTNDAddress,
    vester.address
  ]);
  await rewardRouter.deployed();
  console.log(await rewardRouter.owner())

  console.log('upgrading')
  const VesterV3 = await ethers.getContractFactory("contracts/staking/VesterV3.sol:VesterV3", deployer);
  await upgrades.upgradeProxy(vester.address, VesterV3)

  // vesterProxy.setHandler(rewardRouter.address, true)


}
main()
