//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library MerkelTree {
    function verify(
        bytes32[] calldata _proofs,
        address _sender,
        bytes32 _root
    ) internal pure returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(_sender));

        for (uint256 i = 0; i < _proofs.length; i++) {
            bytes32 proofElement = _proofs[i];

            if (hash < proofElement) {
                hash = keccak256(abi.encodePacked(hash, proofElement));
            } else {
                hash = keccak256(abi.encodePacked(proofElement, hash));
            }
        }

        return hash == _root;
    }
}
