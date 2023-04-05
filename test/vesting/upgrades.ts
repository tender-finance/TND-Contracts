const wallets = [
  // '0x9E3871ff72AFBc1C213CA9D6B018D5EB87aB823F', //supply and staker
  // '0x619d020e83e0A70a9fB14693de5AD7592DEA0ccb', // supply and staker
  // '0x5314f6BDa6a1FD38D3cf779E445b52327e7c0C4a',
]

// const main = async () => {
//   await fundWithEth(admin.address)
//   await Promise.all(wallets.map(async (wallet) => { fundWithEth(wallet) }))
//
//   async function setHandlers(handlerAddress: string) {
//     const targets = [deployments.bnTND, deployments.sbTND, deployments.sbfTND, deployments.sTND, deployments.EsTND];
//     await Promise.all(targets.map(async (target) => {
//       const targetContract = await ethers.getContractAt('EsTND', target, admin)
//       targetContract.setHandler(handlerAddress, true);
//     }));
//   }
//   // Deploying
//   const UpgradableVester = await ethers.getContractFactory("contracts/staking/VesterV2.sol:VesterV2", admin);
//
//   // upgrades.deployProxy()
//   const vester = await upgrades.deployProxy(UpgradableVester, [
//     "Vested TND",
//     "vTND",
//     c.vestingDuration,
//     c.esTNDAddress,
//     c.sbfTNDAddress,
//     c.tndAddress,
//     c.sTNDAddress
//   ])
//
//   await vester.deployed();
//   const VesterV3 = await ethers.getContractFactory("contracts/staking/VesterV3.sol:VesterV3", admin);
//   await upgrades.upgradeProxy(vester.address, VesterV3)
//   await setHandlers(vester.address);
//
//   const RewardRouter = await ethers.getContractFactory("RewardRouterV2", admin);
//
//   await rewardRouter.deployed();
//   await setHandlers(rewardRouter.address);
//   await vester.setHandler(rewardRouter.address, true);
//   const bnTnd = await ethers.getContractAt('MintableBaseToken', '0x0d2ebf71aFdfAfe8E3fde3eAf9C502896F9e3718', admin);
//   await bnTnd.setHandler(rewardRouter.address, true);
//   await bnTnd.setMinter(rewardRouter.address, true);
//   const esTnd = await ethers.getContractAt('EsTND', c.esTNDAddress, admin);
//   await esTnd.setHandler(vester.address, true);
//   await esTnd.setMinter(vester.address, true);
//
//   console.log(await rewardRouter.owner())
//
//   const claim = async (account: any) => {
//     const wallet = await ethers.getImpersonatedSigner(account);
//     await vester.connect(wallet).claim()
//     console.log('new tnd balance:', await tnd.balanceOf(account));
//   }

//   const deposit = async (account: any, amount: any) => {
//     const wallet = await ethers.getImpersonatedSigner(account);
//     await vester.connect(wallet).deposit(amount);
//   }
//
//   const stake = async (account: any, amount: any) => {
//     const wallet = await ethers.getImpersonatedSigner(account);
//     await tnd.connect(wallet).approve(c.sTNDAddress, amount);
//     await tnd.connect(wallet).approve(rewardRouter.address, amount);
//     await rewardRouter.connect(wallet).stakeTnd(amount);
//   }
//   const unstakeAndDeposit = async (account: any, amount: any) => {
//     const wallet = await ethers.getImpersonatedSigner(account);
//     await rewardRouter.connect(wallet).unstakeEsTnd(amount)
//     await vester.connect(wallet).deposit(amount);
//   }
//
//   await unstakeAndDeposit(wallets[0], formatAmount(40))
//   await increaseTime(86400 * 180);
//   console.log('claimable', await vester.claimable(wallets[0]))
//   await claim(wallets[0])
//   console.log('tnd balance', await tnd.balanceOf(wallets[0]))
//
//   const wallet = await ethers.getImpersonatedSigner(wallets[0]);
//   const sbfTnd = await ethers.getContractAt('RewardTracker', c.sbfTNDAddress, wallet);
//   console.log('tnd balance', await sbfTnd.balanceOf(wallets[0]))
//   await rewardRouter.connect(wallet).claimEsTnd();
//   console.log('estnd balance', await esTnd.balanceOf(wallets[0]))
//   await stake(wallets[0], tnd.balanceOf(wallets[0]))
//   console.log('sbftnd balance', await sbfTnd.balanceOf(wallets[0]))
//
//   await unstakeAndDeposit(wallets[0], formatAmount(20))
//   await increaseTime(86400 * 180);
//   console.log(await vester.claimable(wallets[0]))
// }

main()
