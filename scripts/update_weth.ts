import "@nomiclabs/hardhat-ethers"
import hre, {ethers} from "hardhat"

const hex = (n: number) => { return `0x${n.toString(16)}` }
const increaseTime = async (seconds: number) => { await hre.network.provider.send('hardhat_mine', [hex(seconds)]) }

const fundWithEth = async (receiver: any) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

import {
  sbfTND,
  sbfTND_RewardDistributor
} from '../deployments/arbitrum.json'
const wEthAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const eightDaysInSeconds = 60*60*24*8

const main = async () => {
  const [signer] = await ethers.getSigners()
  const wEth = await ethers.getContractAt('Token', wEthAddress, signer)
  const rewardDistributor = await ethers.getContractAt('RewardDistributor', sbfTND_RewardDistributor, signer)
  const balance = await wEth.balanceOf(rewardDistributor.address)
  const tokensPerSecond = balance.div(eightDaysInSeconds)
  console.log(tokensPerSecond)
  await rewardDistributor.setTokensPerInterval(tokensPerSecond);
}

main()
