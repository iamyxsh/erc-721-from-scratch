//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function onERC721Received(
        address to,
        address from,
        uint256 _id,
        bytes memory data
    ) external returns (bytes4);
}
