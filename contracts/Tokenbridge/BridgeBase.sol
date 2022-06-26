//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Base.sol";
import "../libraries/Signature.sol";

contract BridgeBase is Ownable {
    ERC20Base public immutable token;

    event Burn(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes signature
    );

    event Mint(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes signature
    );

    modifier checkSigner(
        address _to,
        address _from,
        uint256 _amount,
        bytes calldata _signature
    ) {
        bytes32 message = Signature.prefixed(
            keccak256(abi.encodePacked(_from, _to, _amount))
        );
        require(
            Signature.recoverSigner(message, _signature) == _from,
            "wrong signature"
        );
        _;
    }

    constructor(address _token) {
        token = ERC20Base(_token);
    }

    function burn(
        address _to,
        uint256 _amount,
        bytes calldata _sign
    ) external onlyOwner {
        token.burn(msg.sender, _amount);
        emit Burn(msg.sender, _to, _amount, _sign);
    }

    function mint(
        address _from,
        address _to,
        uint256 _amount,
        bytes calldata _sign
    ) external checkSigner(_from, _to, _amount, _sign) {
        token.mint(_to, _amount);
        emit Mint(_from, _to, _amount, _sign);
    }
}
