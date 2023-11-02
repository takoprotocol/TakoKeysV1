// SPDX-License-Identifier: AGPL-3.0
import "erc721a/contracts/interfaces/IERC721A.sol";

pragma solidity ^0.8.17;

interface IFarcasterKey is IERC721A {
    function creatorIdOf(uint256 tokenId) external view returns (uint256);

    function creatorIdsOf(
        uint256[] calldata tokenIds
    ) external view returns (uint256[] memory);

    function creatorIdsOfOwner(
        address owner
    ) external view returns (uint256[] memory);

    function mint(
        address to,
        uint256 amount,
        uint256 profileId
    ) external returns (uint256[] memory);

    function burn(uint256 tokenId) external;

    function totalMinted() external view returns (uint256);

    function totalBurned() external view returns (uint256);
}
