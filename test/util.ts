import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat"
import { BigNumber } from 'ethers'

const addresses = [
  { name: 'Tnd', contract: 'TND', address: '0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C' },
  { name: 'esTnd', contract: 'EsTND', address: '0x8a3aB81902E1b3D4A3C73AD3CE250D1A584fE925' },
  { name: 'sbfTnd', contract: 'RewardTracker', address: '0xe94Ebd36482f91B9E97a958F836324442F34C1F4' },
  { name: 'bnTnd', contract: 'RewardTracker', address: '0x510894845e7f632222bd8a912855aa82ba3f7ed0' },
  { name: 'sTnd', contract: 'RewardTracker', address: '0x88514c9be4aa9ac1a4e42a9c4cdff81f62c26a96' },
  { name: 'RewardRouterV2', contract: 'contracts/staking/RewardRouterV2.sol:RewardRouterV2', address: '0xca11F41b1384A7Af40be244eFb602F1a5aFeFf61' },
  { name: 'RewardDistributorEth', contract: 'RewardDistributor', address: '0xa444D42781212E8e66756BE2c404b79a18436fdD' },
  { name: 'RewardDistributorEsTnd', contract: 'RewardDistributor', address: '0x705B3d2DF6e8F8E0e7007f52A7BD66086A12E9aE'},
  { name: 'Vester', contract: 'Vester', address: '0x7bec2668587b1f83aa60bf273864808d11794951' },
  { name: 'wEth', contract: 'contracts/libraries/token/IERC20.sol:IERC20', address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'}
]
export const fundWithEth = async (receiver: any) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

export const formatAmount = (amount: string | number, decimals: number = 18) => {
  amount = (typeof(amount) == 'string') ? amount : amount.toString();
  const regex = /^0*\.0*/;
  let match = amount.match(regex);
  amount = match ? amount.replace(match[0], "") : amount;

  const leadingZeros = match ? match[0].split(".")[1].length + 1 : 0;
  decimals = decimals - leadingZeros;

  const scaleFactor = BigNumber.from("10").pow(decimals);
  return BigNumber.from(amount).mul(scaleFactor);
};

export const getContractInstances = async (signer: any) => {
  const entries = addresses.map(async ({name, contract, address}) => {
    return [name, await ethers.getContractAt(contract, address, signer)]
  })
 return Object.fromEntries(await Promise.all(entries))
}
