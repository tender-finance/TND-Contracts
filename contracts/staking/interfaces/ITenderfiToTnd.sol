// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITenderfiToTnd {
    function redeemDebtWithTnd(address _account, address _receiver, uint256 _amount, bool _flagStake) external;
}
