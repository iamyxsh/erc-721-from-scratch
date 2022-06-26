//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IERC721.sol";

library Utils {
    function _isContract(address _addr) private view returns (bool isContract) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    function implOnERC721Recieved(
        address _from,
        address _to,
        uint256 _id,
        bytes memory data
    ) internal returns (bool) {
        if (_isContract(_to)) {
            try IERC721(_to).onERC721Received(_to, _from, _id, data) returns (
                bytes4 retval
            ) {
                return retval == IERC721.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("cannot transfer token");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function isAddress(address _address) internal pure returns (bool) {
        return _address != address(0);
    }
}
