// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITndToTenderfi {
    function mintForUser(address _account, uint256 _amount) external;
    function redeemUnderlyingForUser(address _account, uint256 _amount) external;
}
