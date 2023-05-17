import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan'
import '@openzeppelin/hardhat-upgrades';
import hre, {ethers, upgrades} from 'hardhat';
import { adminAddress, CONTRACTS as c } from '../utils/constants';
import {upgradeDeployment} from './upgrade';
import {SECONDS_PER_DAY} from '../utils/constants';

const netName = hre.network.name;
// const getSigner = async () => {
//   if(netName == 'hardhat') {
//     const signer = await ethers.getImpersonatedSigner(adminAddress);
//     const [ethWallet] = await ethers.getSigners();
//     await ethWallet.sendTransaction({
//       to: signer.address,
//       value: ethers.utils.parseEther("1.0"),
//     });
//     return signer
//   }
//   const [signer] = await ethers.getSigners();
//   return signer;
// }
async function setVesterDuration (vester: any) {
  await vester.setDuration(SECONDS_PER_DAY/2 * 365);
}

async function test () {
  const vTNDHolder = '0x9aa739abFd59E01F66dcBff88e50f9387e051E55'


}

async function main () {
  const vTNDHolder = '0x9aa739abFd59E01F66dcBff88e50f9387e051E55'
  const contract = await upgradeDeployment('vTND', 'contracts/staking/VesterV2.sol:VesterV2')
  console.log(await contract.claimable(vTNDHolder));
  // await verifyImpl(impl, abi);
  await setVesterDuration(contract);
  console.log(await contract.claimable(vTNDHolder));
}
main()

// upgradeDeployment('InstantVester', 'contracts/staking/InstantVester.sol:InstantVester')
