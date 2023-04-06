import { getDeployments, increaseDays, formatAmount as fa } from '../utils/helpers';
import { instantVestingFixture, setTokensPerInterval }  from './fixtures';
import { CONTRACTS as c } from '../utils/constants';
import {
  expect,
  loadFixture,
  Contract,
  BigNumberish,
  SignerWithAddress,
} from '../imports';

const logBalances = async (contracts: any[], account: any, log=false) => {
  if (account.address){ account = account.address; }
  const balances = []
  for(const contract of contracts) {
    const balance = await contract.balanceOf(account);
    balances.push(balance)
    if(log){
      const name = await contract.symbol();
      console.log(`${name}: ${balance}`)
    }
  }
  return balances
}
describe('InstantVesting', function () {
  it('Should allow someone to instantly recieve 15% of their esTND', async function () {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const [esBalance, tndBalance] = await logBalances([esTND, tnd], testWallet.address, true);
    await instantVester.connect(testWallet).instantVest(esBalance);
    logBalances([esTND, tnd], testWallet, true);
  })
  it('Should not allow someone to vest more esTND than they have', async function () {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const [esBalance, tndBalance] = await logBalances([esTND, tnd], testWallet.address, true);
    expect(
      instantVester.connect(testWallet).instantVest(esBalance.add(1))
    ).revertedWith('InstantVester: amount exceeds balance');
  })
  it('Should not allow someone to call admin functions', async function () {
    const { instantVester, testWallet, multisig} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const [esBalance, tndBalance] = await logBalances([esTND, tnd], testWallet.address, true);
    expect(
      instantVester.connect(testWallet).setReceiverWeight(multisig.address, fa(10,16))
    ).revertedWith('onlyOwner');
  })
})
