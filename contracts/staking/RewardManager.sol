// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../access/Governable.sol";
import "../peripherals/interfaces/ITimelock.sol";

contract RewardManager is Governable {

    bool public isInitialized;

    ITimelock public timelock;
    address public rewardRouter;

    address public stakedTndTracker;
    address public bonusTndTracker;
    address public feeTndTracker;

    address public stakedTndDistributor;

    address public esTnd;
    address public bnTnd;

    address public tndVester;

    function initialize(
        ITimelock _timelock,
        address _rewardRouter,
        address _stakedTndTracker,
        address _bonusTndTracker,
        address _feeTndTracker,
        address _stakedTndDistributor,
        address _esTnd,
        address _bnTnd,
        address _tndVester
    ) external onlyGov {
        require(!isInitialized, "RewardManager: already initialized");
        isInitialized = true;

        timelock = _timelock;
        rewardRouter = _rewardRouter;

        stakedTndTracker = _stakedTndTracker;
        bonusTndTracker = _bonusTndTracker;
        feeTndTracker = _feeTndTracker;

        stakedTndDistributor = _stakedTndDistributor;

        esTnd = _esTnd;
        bnTnd = _bnTnd;

        tndVester = _tndVester;
    }

    function updateEsTndHandlers() external onlyGov {
        timelock.managedSetHandler(esTnd, rewardRouter, true);

        timelock.managedSetHandler(esTnd, stakedTndDistributor, true);

        timelock.managedSetHandler(esTnd, stakedTndTracker, true);

        timelock.managedSetHandler(esTnd, tndVester, true);
    }

    function enableRewardRouter() external onlyGov {
        timelock.managedSetHandler(stakedTndTracker, rewardRouter, true);
        timelock.managedSetHandler(bonusTndTracker, rewardRouter, true);
        timelock.managedSetHandler(feeTndTracker, rewardRouter, true);

        timelock.managedSetHandler(esTnd, rewardRouter, true);

        timelock.managedSetMinter(bnTnd, rewardRouter, true);

        timelock.managedSetMinter(esTnd, tndVester, true);

        timelock.managedSetHandler(tndVester, rewardRouter, true);

        timelock.managedSetHandler(feeTndTracker, tndVester, true);
    }
}
