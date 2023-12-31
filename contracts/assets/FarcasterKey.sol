// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.17;

import "../access/Ownable2Step.sol";
import "../interfaces/IFarcasterKey.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";

contract FarcasterKey is IFarcasterKey, ERC721AQueryable, Ownable2Step {
    address public immutable farcasterKeys;
    string internal baseURI;
    string private constant _name = "FarcasterKeyV1";
    string private constant _symbol = "FK";

    mapping(uint256 => uint256) private _creatorIdByTokenId;

    modifier onlyFarcasterKeys() {
        require(
            msg.sender == farcasterKeys,
            "Only FarcasterKey contract can call"
        );
        _;
    }

    event Mint(uint256[] tokenIds, address tokenOwner, uint256 creatorId);
    event Burn(uint256 tokenId, address tokenOwner, uint256 creatorId);

    constructor(address _owner) ERC721A(_name, _symbol) {
        farcasterKeys = msg.sender;
        _transferOwnership(_owner);
    }

    function creatorIdOf(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "invalid token ID");
        return _creatorIdByTokenId[tokenId];
    }

    function creatorIdsOf(
        uint256[] calldata tokenIds
    ) external view returns (uint256[] memory) {
        uint256 length = tokenIds.length;
        require(length > 0, "invalid tokenIds");

        uint256[] memory creatorIds = new uint256[](length);

        for (uint256 i; i < length; ) {
            require(_exists(tokenIds[i]), "invalid token ID");
            creatorIds[i] = _creatorIdByTokenId[tokenIds[i]];

            unchecked {
                ++i;
            }
        }

        return creatorIds;
    }

    function creatorIdsOfOwner(
        address tokenOwner
    ) external view returns (uint256[] memory) {
        unchecked {
            uint256 idx;
            address currOwnershipAddr;
            uint256 tokenIdsLength = balanceOf(tokenOwner);
            uint256[] memory creatorIds = new uint256[](tokenIdsLength);
            TokenOwnership memory ownership;
            for (uint256 i = _startTokenId(); idx != tokenIdsLength; ++i) {
                ownership = _ownershipAt(i);
                if (ownership.burned) {
                    continue;
                }
                if (ownership.addr != address(0)) {
                    currOwnershipAddr = ownership.addr;
                }
                if (currOwnershipAddr == tokenOwner) {
                    creatorIds[idx++] = _creatorIdByTokenId[i];
                }
            }

            return creatorIds;
        }
    }

    function mint(
        address to,
        uint256 amount,
        uint256 creatorId
    ) external onlyFarcasterKeys returns (uint256[] memory) {
        uint256[] memory newTokenIds = new uint256[](amount);
        uint256 newTokenId = _nextTokenId();

        _safeMint(to, amount);

        for (uint256 i = 0; i < amount; ) {
            newTokenIds[i] = newTokenId;
            _creatorIdByTokenId[newTokenId] = creatorId;

            unchecked {
                ++newTokenId;
                ++i;
            }
        }

        emit Mint(newTokenIds, to, creatorId);
        return newTokenIds;
    }

    function burn(uint256 tokenId) external onlyFarcasterKeys {
        emit Burn(tokenId, ownerOf(tokenId), _creatorIdByTokenId[tokenId]);
        _burn(tokenId, false);
        delete _creatorIdByTokenId[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _totalMinted();
    }

    function totalBurned() external view returns (uint256) {
        return _totalBurned();
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
