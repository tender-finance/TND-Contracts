import { getDeployments, formatAmount as fa } from '../utils/helpers';
import { instantVestingFixture }  from './fixtures';
import {
  expect,
  loadFixture,
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

  it('Should allow someone to instantly recieve % of their esTND', async function () {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const esBalance = await esTND.balanceOf(testWallet.address);
    const claimWeight = await instantVester.claimWeight()

    const correctBalance = esBalance.mul(claimWeight).div(fa(1, 18));

    await instantVester.connect(testWallet).instantVest(esBalance);
    expect(
      (await tnd.balanceOf(testWallet.address)).eq(correctBalance)
    ).true;
  })

  it('Should reduce max supply of TND and EsTND', async function () {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const tndSupplyBefore = await tnd.totalSupply();
    const esTNDSupplyBefore = await esTND.totalSupply();

    const [esBalance] = await logBalances([esTND, tnd], testWallet.address);
    await instantVester.connect(testWallet).instantVest(esBalance);

    const tndSupplyAfter = await tnd.totalSupply();
    const esTNDSupplyAfter = await esTND.totalSupply();
    expect(tndSupplyAfter.lt(tndSupplyBefore)).true;
    expect(esTNDSupplyAfter.lt(esTNDSupplyBefore)).true;
  })

  it('Should not allow someone to vest more esTND than they have', async function () {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const [esBalance, _] = await logBalances([esTND, tnd], testWallet.address);
    expect(
      instantVester.connect(testWallet).instantVest(esBalance.add(1))
    ).revertedWith('InstantVester: amount exceeds balance');
  })

  it('Should not allow someone to call admin functions', async function () {
    const { instantVester, testWallet } = await loadFixture(instantVestingFixture);
    const treasuryWeight = fa(40, 16);
    const claimWeight = fa(10, 16);
    const burnWeight = fa(50, 16);

    expect(
      instantVester.connect(testWallet).setWeights(
        treasuryWeight,
        burnWeight,
        claimWeight
      )
    ).revertedWith('Ownable: caller is not the owner');
    expect(
      instantVester.connect(testWallet).withdraw(1)
    ).revertedWith('Ownable: caller is not the owner');
  })
  it('Should not allow invalid weights to be set', async function () {
    const { instantVester, admin } = await loadFixture(instantVestingFixture);
    const treasuryWeight = fa(41, 16);
    const claimWeight = fa(10, 16);
    const burnWeight = fa(50, 16);

    expect(
      instantVester.connect(admin).setWeights(
        treasuryWeight,
        burnWeight,
        claimWeight
      )
    ).revertedWith('InstantVester: Total distribution not 100%');
  })

  it('should not take too much esTND', async() => {
    const { instantVester, testWallet} = await loadFixture(instantVestingFixture);
    const [esTND, tnd] = await getDeployments(['esTND', 'TND']);
    const [esBalance] = await logBalances([esTND, tnd], testWallet.address);
    const vestAmount = esBalance.div(2);
    await instantVester.connect(testWallet).instantVest(vestAmount);
    const newBalance = await esTND.balanceOf(testWallet.address);
    const success= newBalance.eq(vestAmount)
    expect(success).true
  })
})
