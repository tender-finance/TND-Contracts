import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan'
import '@openzeppelin/hardhat-upgrades';
import hre, {ethers, upgrades} from 'hardhat';
import { adminAddress, CONTRACTS as c } from '../utils/constants';


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

async function upgradeVester() {
  const signer = await getSigner();
  const VesterV2 = await ethers.getContractFactory('VesterV2', signer);
  console.log('upgrading vester');
  await upgrades.upgradeProxy(c.vTND, VesterV2);
  console.log('upgraded vester');
}

upgradeVester()
