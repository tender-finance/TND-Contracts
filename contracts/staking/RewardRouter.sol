// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libraries/math/SafeMath.sol";
import "../libraries/token/IERC20.sol";
import "../libraries/token/SafeERC20.sol";
import "../libraries/utils/ReentrancyGuard.sol";
import "../libraries/utils/Address.sol";

import "./interfaces/IRewardTracker.sol";
import "../tokens/interfaces/IMintable.sol";
import "../tokens/interfaces/IWETH.sol";
import "../access/Governable.sol";

contract RewardRouter is ReentrancyGuard, Governable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address payable;

    bool public isInitialized;

    address public weth;

    address public tnd;
    address public esTnd;
    address public bnTnd;

    address public stakedTndTracker;
    address public bonusTndTracker;
    address public feeTndTracker;

    event StakeTnd(address account, uint256 amount);
    event UnstakeTnd(address account, uint256 amount);

    receive() external payable {
        require(msg.sender == weth, "Router: invalid sender");
    }

    function initialize(
        address _weth,
        address _tnd,
        address _esTnd,
        address _bnTnd,
        address _stakedTndTracker,
        address _bonusTndTracker,
        address _feeTndTracker
    ) external onlyGov {
        require(!isInitialized, "RewardRouter: already initialized");
        isInitialized = true;

        weth = _weth;

        tnd = _tnd;
        esTnd = _esTnd;
        bnTnd = _bnTnd;

        stakedTndTracker = _stakedTndTracker;
        bonusTndTracker = _bonusTndTracker;
        feeTndTracker = _feeTndTracker;
    }

    // to help users who accidentally send their tokens to this contract
    function withdrawToken(address _token, address _account, uint256 _amount) external onlyGov {
        IERC20(_token).safeTransfer(_account, _amount);
    }

    function batchStakeTndForAccount(address[] memory _accounts, uint256[] memory _amounts) external nonReentrant onlyGov {
        address _tnd = tnd;
        for (uint256 i = 0; i < _accounts.length; i++) {
            _stakeTnd(msg.sender, _accounts[i], _tnd, _amounts[i]);
        }
    }

    function stakeTndForAccount(address _account, uint256 _amount) external nonReentrant onlyGov {
        _stakeTnd(msg.sender, _account, tnd, _amount);
    }

    function stakeTnd(uint256 _amount) external nonReentrant {
        _stakeTnd(msg.sender, msg.sender, tnd, _amount);
    }

    function stakeEsTnd(uint256 _amount) external nonReentrant {
        _stakeTnd(msg.sender, msg.sender, esTnd, _amount);
    }

    function unstakeTnd(uint256 _amount) external nonReentrant {
        _unstakeTnd(msg.sender, tnd, _amount);
    }

    function unstakeEsTnd(uint256 _amount) external nonReentrant {
        _unstakeTnd(msg.sender, esTnd, _amount);
    }

    function claim() external nonReentrant {
        address account = msg.sender;

        IRewardTracker(feeTndTracker).claimForAccount(account, account);
        IRewardTracker(stakedTndTracker).claimForAccount(account, account);
    }

    function claimEsTnd() external nonReentrant {
        address account = msg.sender;

        IRewardTracker(stakedTndTracker).claimForAccount(account, account);
    }

    function claimFees() external nonReentrant {
        address account = msg.sender;

        IRewardTracker(feeTndTracker).claimForAccount(account, account);
    }

    function compound() external nonReentrant {
        _compound(msg.sender);
    }

    function compoundForAccount(address _account) external nonReentrant onlyGov {
        _compound(_account);
    }

    function batchCompoundForAccounts(address[] memory _accounts) external nonReentrant onlyGov {
        for (uint256 i = 0; i < _accounts.length; i++) {
            _compound(_accounts[i]);
        }
    }

    function _compound(address _account) private {
        _compoundTnd(_account);
    }

    function _compoundTnd(address _account) private {
        uint256 esTndAmount = IRewardTracker(stakedTndTracker).claimForAccount(_account, _account);
        if (esTndAmount > 0) {
            _stakeTnd(_account, _account, esTnd, esTndAmount);
        }

        uint256 bnTndAmount = IRewardTracker(bonusTndTracker).claimForAccount(_account, _account);
        if (bnTndAmount > 0) {
            IRewardTracker(feeTndTracker).stakeForAccount(_account, _account, bnTnd, bnTndAmount);
        }
    }

    function _stakeTnd(address _fundingAccount, address _account, address _token, uint256 _amount) private {
        require(_amount > 0, "RewardRouter: invalid _amount");

        IRewardTracker(stakedTndTracker).stakeForAccount(_fundingAccount, _account, _token, _amount);
        IRewardTracker(bonusTndTracker).stakeForAccount(_account, _account, stakedTndTracker, _amount);
        IRewardTracker(feeTndTracker).stakeForAccount(_account, _account, bonusTndTracker, _amount);

        emit StakeTnd(_account, _amount);
    }

    function _unstakeTnd(address _account, address _token, uint256 _amount) private {
        require(_amount > 0, "RewardRouter: invalid _amount");

        uint256 balance = IRewardTracker(stakedTndTracker).stakedAmounts(_account);

        IRewardTracker(feeTndTracker).unstakeForAccount(_account, bonusTndTracker, _amount, _account);
        IRewardTracker(bonusTndTracker).unstakeForAccount(_account, stakedTndTracker, _amount, _account);
        IRewardTracker(stakedTndTracker).unstakeForAccount(_account, _token, _amount, _account);

        uint256 bnTndAmount = IRewardTracker(bonusTndTracker).claimForAccount(_account, _account);
        if (bnTndAmount > 0) {
            IRewardTracker(feeTndTracker).stakeForAccount(_account, _account, bnTnd, bnTndAmount);
        }

        uint256 stakedBnTnd = IRewardTracker(feeTndTracker).depositBalances(_account, bnTnd);
        if (stakedBnTnd > 0) {
            uint256 reductionAmount = stakedBnTnd.mul(_amount).div(balance);
            IRewardTracker(feeTndTracker).unstakeForAccount(_account, bnTnd, reductionAmount, _account);
            IMintable(bnTnd).burn(_account, reductionAmount);
        }

        emit UnstakeTnd(_account, _amount);
    }
}
