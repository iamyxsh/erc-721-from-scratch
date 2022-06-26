//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library Signature {
    modifier checkSigLength(bytes memory _sig) {
        require(_sig.length == 65, "invalid sig length");
        _;
    }

    function prefixed(bytes32 _hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            );
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSign(sig);

        return ecrecover(message, v, r, s);
    }

    function splitSign(bytes memory _sig)
        internal
        pure
        checkSigLength(_sig)
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }

        return (v, r, s);
    }
}
