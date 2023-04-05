import { getDeployment, increaseDays, formatAmount as fa } from '../utils/helpers';
import { vestingFixture }  from './fixtures';
import { CONTRACTS as c } from '../utils/constants';
import {
  expect,
  loadFixture,
  Contract,
  BigNumberish,
  SignerWithAddress,
} from '../imports';

async function deposit(vester: Contract, amount: BigNumberish, signer: SignerWithAddress) {
  const esTND = await getDeployment('esTND');
  await esTND.connect(signer).approve(vester.address, amount);
  await vester.connect(signer).deposit(amount);
}

async function stakeTND(rewardRouter: Contract, amount: BigNumberish, signer: SignerWithAddress) {
  const tnd = await getDeployment('TND');
  await tnd.connect(signer).approve(rewardRouter.address, amount)
  await tnd.connect(signer).approve(c.sTND.address, amount)
  await rewardRouter.connect(signer).stakeTnd(amount);
}

describe('vesting', function () {
  it('should revert if staked amount < deposit amount', async () => {
    const { testWallet, vester } = await loadFixture(vestingFixture);
    const depositAmount = fa(1000);
    expect(deposit(vester, depositAmount, testWallet))
      .revertedWith('Vester: max vestable amount exceeded')
  });

  it('Should vest after 1 year', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(1000);

    const tnd = await getDeployment('TND');
    await stakeTND(rewardRouter, depositAmount, testWallet);

    await deposit(vester, depositAmount, testWallet);
    let balance = await tnd.balanceOf(testWallet.address);
    await increaseDays(365);
    await vester.connect(testWallet).claim();
    balance = (await tnd.balanceOf(testWallet.address)).sub(balance);
    expect(balance).to.equal(depositAmount);
  });

  it('Should not vest if TND unstaked', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(1000);
    await stakeTND(rewardRouter, depositAmount, testWallet);
    await deposit(vester, depositAmount, testWallet);
    expect(rewardRouter.connect(testWallet).unstakeTnd(1))
      .revertedWith('RewardTracker: burn amount exceeds balance')
  })
})
