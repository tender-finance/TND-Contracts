import '@nomiclabs/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import {ethers, upgrades} from 'hardhat';

const tndAddress ='0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C';
const esTNDAddress ='0xff9bD42211F12e2de6599725895F37b4cE654ab2';
const bnTNDAddress = '0x0d2ebf71aFdfAfe8E3fde3eAf9C502896F9e3718';
const sTNDAddress = '0x0597c60BD1230A040953CB1C54d0e854CD522932';
const sbTNDAddress = '0xE5538bfCCbA7456A66d4C5f9019988c1E5F09E91';
const sbfTNDAddress = '0x6c6F25C37Db5620389E02B78Ef4664874B69539c';
const nativeTokenAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const vestingDuration = 365 * 24 * 60 * 60;


const main = async () => {
  // Deploying
  const UpgradableVester = await ethers.getContractFactory("UpgradableVester");
  const vesterBeacon = await upgrades.deployBeacon(UpgradableVester);

  const instance = await upgrades.deployProxy(UpgradableVester, [
    "Vested TND",
    "vTND",
    vestingDuration,
    esTNDAddress,
    sbfTNDAddress,
    tndAddress,
    sTNDAddress
  ]);

  await instance.deployed();
  const vesterAddress = vesterBeacon.address;

  const RewardRouter = await ethers.getContractFactory("RewardRouterV2");
  const rewardRouter = await upgrades.deployBeacon(RewardRouter);
  await rewardRouter.deployed();

  rewardRouter.initialize(
    nativeTokenAddress,
    tndAddress,
    esTNDAddress,
    bnTNDAddress,
    sTNDAddress,
    sbTNDAddress,
    sbfTNDAddress,
    vesterAddress
  );
  tndVester.setHandler(rewardRouter.address, true)


}
main()
