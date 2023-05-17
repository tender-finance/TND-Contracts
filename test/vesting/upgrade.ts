import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan'
import '@openzeppelin/hardhat-upgrades';
import hre, {ethers, upgrades} from 'hardhat';
import { adminAddress, CONTRACTS as c } from '../utils/constants';
import {DeploymentName} from '../../types';


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


export async function vestingFixture () {
  const signer = await getSigner();
  const VesterV2 = await ethers.getContractFactory('VesterV2', signer);
  console.log('upgrading vester');
  await upgrades.upgradeProxy(c.vTND, VesterV2);
  console.log('upgraded vester');
}

async function verifyImpl (impl: string, abi: string) {
  console.log('Starting Implementation Verification:')
  try {
    await hre.run("verify:verify", {
      address: impl,
      contract: abi,
      constructorArguments: [],
    });
    console.log('Implementation Verified');
  } catch (e) {
    console.log('Implementation Verification Failed');
    console.log(e);
  }
}
export async function upgradeDeployment(name: DeploymentName, abi: string) {
  const signer = await getSigner();

  const Factory = await ethers.getContractFactory(abi, signer);
  console.log(`upgrading: ${name}`);

  const contract = await upgrades.upgradeProxy(c[name], Factory);
  await contract.deployed()
  console.log(`upgraded: ${name}`);

  const impl = await upgrades.erc1967.getImplementationAddress(contract.address)
  console.log('impl.address', impl);
  if(netName != 'hardhat') {
    await verifyImpl(impl, abi);
  }
  return contract;
}
