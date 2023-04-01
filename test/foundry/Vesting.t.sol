// SPDX-License-Identifier: MIT
pragma experimental ABIEncoderV2;

import {SafeMath} from '../../contracts/libraries/math/SafeMath.sol';
import {Vester} from '../../contracts/staking/Vester.sol';
import {console2} from 'forge-std/console2.sol';
import {EsTND} from '../../contracts/tnd/EsTND.sol';
import {RewardRouterV2} from '../../contracts/staking/RewardRouterV2.sol';
import {RewardTracker} from '../../contracts/staking/RewardTracker.sol';
import {TND} from '../../contracts/tnd/TND.sol';
import {BaseToken} from '../../contracts/tokens/BaseToken.sol';
import "forge-std/Test.sol";
// import "forge-std/Vm.sol";


contract TestVesting is Test {
  using SafeMath for uint256;
  address payable admin = payable(0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac);
  address payable wallet = payable(0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2);
  Vester public vester;
  TND tnd = TND(0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C);
  EsTND esTND = EsTND(0xff9bD42211F12e2de6599725895F37b4cE654ab2);

  RewardTracker public bnTND = RewardTracker(0x0d2ebf71aFdfAfe8E3fde3eAf9C502896F9e3718);
  RewardTracker public sTND = RewardTracker(0x0597c60BD1230A040953CB1C54d0e854CD522932);
  RewardTracker public sbTND = RewardTracker(0xE5538bfCCbA7456A66d4C5f9019988c1E5F09E91);
  RewardTracker public sbfTND = RewardTracker(0x6c6F25C37Db5620389E02B78Ef4664874B69539c);
  RewardRouterV2 public rewardRouter;
  address nativeToken = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

  uint startingBalance;

  function getBalanceDiff () public view  {
    console2.log('TND gained: %d', tnd.balanceOf(wallet).sub(startingBalance));
  }

  function setUp () public {
    vm.deal(wallet, 1000e18);
    vm.deal(admin, 1000e18);
    vm.startPrank(admin);
    // BaseToken(address(esTND)).setHandler(address(wallet), true);
    uint vestingDuration = 365 * 24 * 60 * 60;

    vester = new Vester(
      "Vested TND",
      "vTND",
      vestingDuration,
      address(esTND),
      address(sbfTND),
      address(tnd),
      address(sTND)
    );

    rewardRouter = new RewardRouterV2();
    rewardRouter.initialize(
      nativeToken,
      address(tnd),
      address(esTND),
      address(bnTND),
      address(sTND),
      address(sbTND),
      address(sbfTND),
      address(vester)
    );
    sTND.setHandler(address(rewardRouter), true);
    sTND.setHandler(address(bnTND), true);
    sTND.setHandler(address(sbTND), true);
    sTND.setHandler(address(sbfTND), true);

    sbTND.setHandler(address(rewardRouter), true);
    sbTND.setHandler(address(sTND), true);
    sbTND.setHandler(address(bnTND), true);
    sbTND.setHandler(address(sbfTND), true);
    //
    bnTND.setHandler(address(rewardRouter), true);
    bnTND.setHandler(address(sbfTND), true);
    bnTND.setHandler(address(sbTND), true);
    //
    sbfTND.setHandler(address(rewardRouter), true);
    sbfTND.setHandler(address(vester), true);
    //
    esTND.setHandler(address(rewardRouter), true);
    esTND.setHandler(address(sTND), true);
    esTND.setHandler(address(vester), true);
    esTND.setMinter(address(vester), true);

    bnTND.setHandler(address(sbfTND), true);
    EsTND(address(bnTND)).setMinter(address(rewardRouter), true);

    vm.stopPrank();

    vm.startPrank(wallet);
    tnd.approve(address(vester), tnd.balanceOf(wallet));
    tnd.transfer(address(vester), tnd.balanceOf(wallet)/2);
    bnTND.approve(address(rewardRouter), 1e30);
    bnTND.approve(address(sbTND), 1e30);
    esTND.approve(address(rewardRouter), 1e30);
    esTND.approve(address(vester), 1e30);
    esTND.approve(address(sTND), 1e30);
    esTND.approve(address(sbfTND), 1e30);
    vm.stopPrank();

    startingBalance = tnd.balanceOf(wallet);
  }

  // function testVesting () public {
  //   vm.startPrank(wallet);
  //   console2.log('wallet maxVestable: %s', vester.getMaxVestableAmount(wallet));
  //   esTND.mint(wallet, 100000e18);
  //   console2.log('wallet TND: %d', tnd.balanceOf(wallet));
  //
  //   rewardRouter.stakeEsTnd(2000e18);
  //   for (uint i = 0; i < 52; i++) {
  //     rewardRouter.compound();
  //     vm.warp(block.timestamp + 7 days);
  //   }
  //   console.log('depositBalance', sTND.depositBalances(wallet, address(esTND)));
  //   // uint currentBalance = esTND.balanceOf(wallet);
  //   // console2.log('claimed esTND: %d', esTND.balanceOf(wallet).sub(currentBalance));
  //   console2.log('wallet maxVestable: %s', vester.getMaxVestableAmount(wallet));
  //
  //   vester.deposit(650e18);
  //   vm.warp(block.timestamp + 180 days);
  //   vester.claim();
  //   getBalanceDiff();
  // }

  function testStaking () public {
    vm.startPrank(wallet);
    console2.log('wallet TND: %d', tnd.balanceOf(wallet));
    tnd.approve(address(rewardRouter), 1e30);
    tnd.approve(address(sTND), 1e30);

    rewardRouter.stakeTnd(365e18);
    vm.warp(block.timestamp + 365 days);
    rewardRouter.claimEsTnd();
    console2.log('wallet maxVestable: %s', vester.getMaxVestableAmount(wallet));

    vester.deposit(1e18);
    vm.warp(block.timestamp + 2 days);
    console2.log('amount claimable: %s', vester.claimable(wallet));
    // console2.log('wallet maxVestable: %s', vester.getMaxVestableAmount(wallet));

    // for (uint i = 0; i < 52; i++) {
    //   rewardRouter.compound();
      // vm.warp(block.timestamp + 7 days);
    // }
    // console.log('depositBalance', sTND.depositBalances(wallet, address(esTND)));
    // console.log('depositBalance', esTND.balanceOf(wallet));
    // uint currentBalance = esTND.balanceOf(wallet);
    // console2.log('claimed esTND: %d', esTND.balanceOf(wallet).sub(currentBalance));
    // console2.log('wallet maxVestable: %s', vester.getMaxVestableAmount(wallet));

    // vm.warp(block.timestamp + 180 days);
    // vester.claim();
  }



}
