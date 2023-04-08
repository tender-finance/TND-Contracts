import { getDeployment, increaseDays, formatAmount as fa } from '../utils/helpers';
import { vestingFixture, setTokensPerInterval, getVesterArgs, getRewardRouterArgs }  from './fixtures';
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

async function stakeEsTND(rewardRouter: Contract, amount: BigNumberish, signer: SignerWithAddress) {
  const esTND = await getDeployment('esTND');
  await esTND.connect(signer).approve(rewardRouter.address, amount)
  await esTND.connect(signer).approve(c.sTND.address, amount)
  await rewardRouter.connect(signer).stakeEsTnd(amount);
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

  it('Should not allow unstaking reserved TND', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(1000);
    await stakeTND(rewardRouter, depositAmount, testWallet);
    await deposit(vester, depositAmount, testWallet);
    expect(rewardRouter.connect(testWallet).unstakeTnd(1))
      .revertedWith('RewardTracker: burn amount exceeds balance')
  })

  it('Should not allow unstaking reserved esTND', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const esTNDBalance = await (await getDeployment('esTND')).balanceOf(testWallet.address);
    const depositAmount = esTNDBalance.div(2);
    await stakeEsTND(rewardRouter, depositAmount, testWallet);
    await deposit(vester, depositAmount, testWallet);
    expect(rewardRouter.connect(testWallet).unstakeEsTnd(1))
      .revertedWith('RewardTracker: burn amount exceeds balance')
  })

  it('Should allow unstaking unreserved TND', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(500);
    await stakeTND(rewardRouter, depositAmount.mul(2), testWallet);
    await deposit(vester, depositAmount, testWallet);
    expect(rewardRouter.connect(testWallet).unstakeTnd(depositAmount))
      .not.reverted;
  })

  it('Should only allow vesting same amount as tokens staked', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    await stakeTND(rewardRouter, fa(250), testWallet);
    await stakeEsTND(rewardRouter, fa(150), testWallet);
    const sbfTND = await getDeployment('sbfTND');
    expect(deposit(vester, await sbfTND.balanceOf(testWallet.address), testWallet))
     .not.reverted;
    expect(deposit(vester, 1, testWallet))
     .revertedWith('Vester: max vestable amount exceeded');
  })

  it('Should allow unstaking TND if vesting is cancelled', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(1000);
    await stakeTND(rewardRouter, depositAmount, testWallet);
    await deposit(vester, depositAmount, testWallet);
    await increaseDays(1);
    await vester.connect(testWallet).withdraw();
    expect(rewardRouter.connect(testWallet).unstakeTnd(depositAmount))
      .not.reverted;
  })

  it('Should not allow vesting two sets of esTND <= staked TND', async () => {
    const { testWallet, vester, rewardRouter } = await loadFixture(vestingFixture);
    const depositAmount = fa(200);
    await setTokensPerInterval('sbfTND_RewardDistributor', 0);

    await stakeTND(rewardRouter, depositAmount, testWallet);

    await deposit(vester, depositAmount, testWallet);
    await increaseDays(366);
    await vester.connect(testWallet).claim();
    expect(deposit(vester, 1, testWallet)).revertedWith('Vester: max vestable amount exceeded')
  })
  it('should not allow re-initialization of vester', async() => {
    const { vester } = await loadFixture(vestingFixture);
    const vesterArgs = getVesterArgs();
    expect(vester.initialize(...vesterArgs)).revertedWith(
      'Initializable: contract is already initialized'
    )
  })
})
