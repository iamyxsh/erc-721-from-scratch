//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IERC721.sol";
import "hardhat/console.sol";

contract ERC721 {
    uint256 public total = 0;
    uint256 public totalBurned = 0;
    uint256 public immutable MAX_SUPPLY;

    address public owner;

    bytes32 public immutable MINTER_MERKLE_ROOT;

    bool public pause = false;

    string public name;
    string public symbol;

    mapping(uint256 => address) public owners;
    mapping(address => uint256) public balance;

    mapping(uint256 => address) public tokenApprovals;
    mapping(address => mapping(address => bool)) public approvedForAll;

    event Transfer(
        address indexed _from,
        address indexed _to,
        uint256 indexed _id
    );
    event Approval(
        address indexed _owner,
        address indexed _approved,
        uint256 indexed _id
    );
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _minterRoot,
        uint256 _maxSupply
    ) {
        name = _name;
        symbol = _symbol;
        MINTER_MERKLE_ROOT = _minterRoot;
        MAX_SUPPLY = _maxSupply;
        owner = msg.sender;
    }

    modifier checkZeroAddress(address _owner) {
        require(_isAddress(_owner), "address cannot be zero");
        _;
    }

    modifier checkIfTokenMinted(uint256 _id) {
        uint256 totalMinted = total + totalBurned;
        require(_id < totalMinted || _id < MAX_SUPPLY, "invalid _id");
        _;
    }

    modifier checkIfTokenBurned(uint256 _id) {
        require(owners[_id] != address(this), "token burned");
        _;
    }

    modifier checkSpender(uint256 _id) {
        require(_approvedOrOwner(msg.sender, _id), "not allowed");
        _;
    }

    modifier checkOwnAddrTransfer(address _to) {
        require(msg.sender != _to, "not allowed to own address");
        _;
    }

    modifier checkMintQuantity(uint256 _quantity) {
        require(_quantity != 0, "not allowed to own address");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender != owner, "only owner");
        _;
    }

    modifier checkPaused() {
        require(pause, "already paused");
        _;
    }

    modifier checkUnpaused() {
        require(!pause, "already unpaused");
        _;
    }

    modifier checkMinter(bytes32[] calldata _proofs) {
        require(_verify(_proofs), "not a whitelisted minter");
        _;
    }

    function balanceOf(address _owner)
        external
        view
        checkZeroAddress(_owner)
        returns (uint256)
    {
        return balance[_owner];
    }

    function ownerOf(uint256 _id)
        public
        view
        checkIfTokenMinted(_id)
        checkIfTokenBurned(_id)
        returns (address _owner)
    {
        if (owners[_id] != address(0)) {
            return owners[_id];
        } else {
            for (uint256 i = _id; i >= 0; i--) {
                if (owners[i] != address(0)) {
                    return owners[i];
                } else {
                    continue;
                }
            }
        }
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id
    )
        external
        payable
        checkSpender(_id)
        checkZeroAddress(_to)
        checkOwnAddrTransfer(_to)
    {
        safeTransferFrom(_from, _to, _id, "");
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        bytes memory _data
    )
        public
        payable
        checkSpender(_id)
        checkZeroAddress(_to)
        checkOwnAddrTransfer(_to)
    {
        _transfer(_from, _to, _id);
        require(
            _implOnERC721Recieved(_from, _to, _id, _data),
            "cannot transfer token"
        );
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    )
        external
        payable
        checkSpender(_id)
        checkZeroAddress(_to)
        checkOwnAddrTransfer(_to)
    {
        _transfer(_from, _to, _id);
    }

    function approve(address _to, uint256 _id)
        external
        payable
        checkSpender(_id)
        checkZeroAddress(_to)
        checkOwnAddrTransfer(_to)
    {
        _approve(_to, _id);
    }

    function setApprovalForAll(address _to, bool _approved)
        external
        checkZeroAddress(_to)
        checkOwnAddrTransfer(_to)
    {
        _setApprovalForAll(msg.sender, _to, _approved);
    }

    function getApproved(uint256 _id) external view returns (address) {
        return tokenApprovals[_id];
    }

    function isApprovedForAll(address _owner, address _to)
        external
        view
        returns (bool)
    {
        return approvedForAll[_owner][_to];
    }

    function mint(
        address _to,
        uint256 _quantity,
        bytes32[] calldata _proofs
    )
        external
        checkZeroAddress(_to)
        checkMintQuantity(_quantity)
        checkMinter(_proofs)
    {
        uint256 start = total + totalBurned;
        uint256 end = start + _quantity;
        owners[start] = msg.sender;

        balance[_to] += _quantity;

        for (uint256 i = start; i < end; i++) {
            emit Transfer(address(0), _to, i);
        }

        total = total + _quantity;
    }

    function burn(uint256 _id) external checkSpender(_id) {
        owners[_id] = address(this);

        if (owners[_id - 1] == address(0)) {
            owners[_id - 1] = msg.sender;
        }

        if (owners[_id + 1] == address(0)) {
            owners[_id + 1] = msg.sender;
        }

        totalBurned++;
    }

    function pauseMinting() external onlyOwner checkPaused {
        pause = true;
    }

    function unpauseMinting() external onlyOwner checkUnpaused {
        pause = false;
    }

    function _approvedOrOwner(address _requester, uint256 _id)
        internal
        view
        returns (bool)
    {
        address _owner = ownerOf(_id);

        return
            _isAddress(_owner) ||
            _isApproved(_requester, _id) ||
            _isApprovedForAll(owners[_id], _requester);
    }

    function _isAddress(address _address) internal pure returns (bool) {
        return _address != address(0);
    }

    function _isApproved(address _requester, uint256 _id)
        internal
        view
        returns (bool)
    {
        return _requester == tokenApprovals[_id];
    }

    function _isApprovedForAll(address _owner, address _requester)
        internal
        view
        returns (bool)
    {
        return approvedForAll[_owner][_requester];
    }

    function _implOnERC721Recieved(
        address _from,
        address _to,
        uint256 _id,
        bytes memory data
    ) private returns (bool) {
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

    function _isContract(address _addr) private view returns (bool isContract) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _id
    ) internal {
        balance[_from] -= 1;
        balance[_to] += 1;
        owners[_id] = _to;

        if (owners[_id - 1] == address(0)) {
            owners[_id - 1] = _from;
        }

        if (owners[_id + 1] == address(0)) {
            owners[_id + 1] = _from;
        }

        tokenApprovals[_id] = address(0);

        emit Transfer(_from, _to, _id);
    }

    function _approve(address _to, uint256 _id) internal {
        tokenApprovals[_id] = _to;
        emit Approval(owners[_id], _to, _id);
    }

    function _setApprovalForAll(
        address _owner,
        address _to,
        bool _approved
    ) internal {
        approvedForAll[_owner][_to] = _approved;
        emit ApprovalForAll(_owner, _to, _approved);
    }

    function _verify(bytes32[] calldata _proofs) private view returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(msg.sender));

        for (uint256 i = 0; i < _proofs.length; i++) {
            bytes32 proofElement = _proofs[i];

            if (hash < proofElement) {
                hash = keccak256(abi.encodePacked(hash, proofElement));
            } else {
                hash = keccak256(abi.encodePacked(proofElement, hash));
            }
        }

        return hash == MINTER_MERKLE_ROOT;
    }
}
