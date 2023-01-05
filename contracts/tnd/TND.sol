// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../tokens/MintableBaseToken.sol";

contract TND is MintableBaseToken {
    constructor() public MintableBaseToken("TND", "TND", MAX_Supply) {
    }

    function id() external pure returns (string memory _name) {
        return "TND";
    }
}
