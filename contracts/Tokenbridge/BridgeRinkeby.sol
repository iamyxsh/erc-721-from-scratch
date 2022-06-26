//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./BridgeBase.sol";

contract BridgeRinkeby is BridgeBase {
    constructor(address _token) BridgeBase(_token) {}
}
