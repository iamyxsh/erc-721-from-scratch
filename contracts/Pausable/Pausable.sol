//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../Ownable/Ownable.sol";

import "hardhat/console.sol";

contract Pausable is Ownable {
    bool public pause = false;

    modifier checkPaused() {
        require(pause == true, "unpaused");
        _;
    }

    modifier checkUnpaused() {
        require(pause == false, "paused");
        _;
    }

    function pauseMinting() external onlyOwner checkUnpaused {
        pause = true;
    }

    function unpauseMinting() external onlyOwner checkPaused {
        pause = false;
    }
}
