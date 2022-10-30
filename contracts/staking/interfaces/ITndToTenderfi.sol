// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITndToTenderfi {
    function mintTsTnd(address _account, uint256 _amount) external;
    function redeemTsTnd(address _account, uint256 _amount) external;
}
