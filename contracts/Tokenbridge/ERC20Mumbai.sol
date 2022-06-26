//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC20Base.sol";

contract ERC20Mumbai is ERC20Base {
    constructor(string memory _name, string memory _symbol)
        ERC20Base(_name, _symbol)
    {}
}
