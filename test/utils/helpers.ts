import '@nomiclabs/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, {ethers, upgrades} from 'hardhat';
import { BigNumber } from 'ethers';
import {DeploymentName} from '../../types';
import {
  SECONDS_PER_DAY,
  CONTRACTS
} from './constants'

export const hex = (n: number) => { return `0x${n.toString(16)}` }
export const increaseTime = async (seconds: number) => { await hre.network.provider.send('hardhat_mine', [hex(seconds)]) }
export const increaseDays = async (days: number) => { await increaseTime(days * SECONDS_PER_DAY) }

export function formatAmount (amount: string | number, decimals: number = 18) {
  amount = (typeof(amount) == 'string') ? amount : amount.toString();
  const regex = /^0*\.0*/;
  let match = amount.match(regex);
  amount = match ? amount.replace(match[0], "") : amount;

  const leadingZeros = match ? match[0].split(".")[1].length + 1 : 0;
  decimals = decimals - leadingZeros;

  const scaleFactor = BigNumber.from("10").pow(decimals);
  return BigNumber.from(amount).mul(scaleFactor);
};

export async function fundWithEth (receiver: any) {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

export async function getDeployment (contract: DeploymentName) {
  const contractInfo = CONTRACTS[contract];
  if(!contractInfo){throw new Error(`Contract ${contract} not found`)}
  return await ethers.getContractAt(contractInfo.contract, contractInfo.address);
}

export async function getDeployments (contracts: DeploymentName[]) {
  return await Promise.all(contracts.map(async (contract) => {
    return getDeployment(contract)
  }));
}

export async function deployUpgradable (abi: string, args: any[], signer: any) {
  const Factory = await ethers.getContractFactory(abi, signer);
  return await upgrades.deployProxy(Factory, args, signer)
}
export async function upgrade (address: string, abi: string, signer: any) {
  const VesterV3 = await ethers.getContractFactory(abi, signer);
  return await upgrades.upgradeProxy(address, VesterV3, signer)
}

export async function setHandler(handlerAddress: string, contracts: DeploymentName[], signer: any) {
  for (const contractName of contracts) {
    const contract = await getDeployment(contractName);
    await contract.connect(signer).setHandler(handlerAddress, true);
  }
}

export async function setMinter(handlerAddress: string, contracts: DeploymentName[], signer: any) {
  for (const contractName of contracts) {
    const contract = await getDeployment(contractName);
    await contract.connect(signer).setHandler(handlerAddress, true);
  }
}
