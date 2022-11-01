// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libraries/math/SafeMath.sol";
import "../libraries/token/IERC20.sol";
import "../libraries/token/SafeERC20.sol";
import "../libraries/utils/ReentrancyGuard.sol";
import "../libraries/utils/Address.sol";

import "./interfaces/IRewardTracker.sol";
import "./interfaces/IVester.sol";
import "../tokens/interfaces/IMintable.sol";
import "../tokens/interfaces/IWETH.sol";
import "../access/Governable.sol";
import "./interfaces/ITenderfiToTnd.sol";
import "./interfaces/ITndToTenderfi.sol";

//contract TestTenderfi is ReentrancyGuard, Governable, ITndToTenderfi {
//    using SafeMath for uint256;
//    using SafeERC20 for IERC20;
//}

contract TestTenderfi is ReentrancyGuard, Governable, ITndToTenderfi {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public tndProtocol;
    mapping (address => uint256) public eligibilityForLoan;
    mapping (address => uint256) public takenLoanMap;

    function setTndProtocol(address _account) external onlyGov {
        tndProtocol = _account;
    }

    // This method is called on the Tnd.
    // Gives the user the right to receive loan
    function mintTsTnd(address _account, uint256 _amount) external override {
        require(msg.sender == tndProtocol, "TestTenderfi: invalid msg.sender");

        eligibilityForLoan[_account] = eligibilityForLoan[_account].add(_amount);
    }

    // This method is called on the Tnd.
    // Deprives the user of the right to receive loan
    function redeemTsTnd(address _account, uint256 _amount) external  override {
        require(msg.sender == tndProtocol, "TestTenderfi: invalid msg.sender");
        require(eligibilityForLoan[_account] >= _amount, "TestTenderfi: not redeemable");

        eligibilityForLoan[_account] = eligibilityForLoan[_account].sub(_amount);
    }

    // Redeems the user's debt
    function redeemDebt(address _account, address _receiver, uint256 _amount) external onlyGov {
        require(takenLoanMap[_account] >= _amount, "TestTenderfi: loan not taken");

        takenLoanMap[_account] = takenLoanMap[_account].sub(_amount);
        ITenderfiToTnd(tndProtocol).redeemDebtWithTnd(_account, _receiver, _amount);
    }

    // It is a simple method for test only.
    // The user takes out a loan
    function takeLoan(uint256 _amount) external {
        require(eligibilityForLoan[msg.sender] >= _amount, "TestTenderfi: not eligibility for loan");

        eligibilityForLoan[msg.sender] = eligibilityForLoan[msg.sender].sub(_amount);
        takenLoanMap[msg.sender] = takenLoanMap[msg.sender].add(_amount);
    }

    // It is a simple method for test only
    // The user repays loan
    function repaysLoan(uint256 _amount) external {
        require(takenLoanMap[msg.sender] >= _amount, "TestTenderfi: loan not taken");

        takenLoanMap[msg.sender] = takenLoanMap[msg.sender].sub(_amount);
        eligibilityForLoan[msg.sender] = eligibilityForLoan[msg.sender].add(_amount);
    }
}
