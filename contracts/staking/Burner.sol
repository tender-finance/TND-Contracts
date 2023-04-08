// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import {MintableBaseToken} from "../tokens/MintableBaseToken.sol";
import {IERC20} from "../libraries/token/IERC20.sol";
import {SafeERC20} from "../libraries/token/SafeERC20.sol";
import {ReentrancyGuard} from "../libraries/utils/ReentrancyGuard.sol";
import {Ownable} from "../libraries/access/Ownable.sol";

contract Burner is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    mapping(address=> bool) public isHandler;

    constructor() public {}

    function transferAndBurn(address token, uint256 amount) public nonReentrant {
        require(isHandler[msg.sender], "Burner: Not a handler");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        MintableBaseToken(token).burn(address(this), amount);
    }
    function setHandler(address _handler, bool _isHandler) public onlyOwner {
        isHandler[_handler] = _isHandler;
    }
}
