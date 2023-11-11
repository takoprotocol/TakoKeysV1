// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.17;

interface ITakoKeysV1 {
    function userClaimable(address user) external view returns(uint256);

    function setFeeDestination(address _feeDestination) external;

    function setProtocolBuyFeePercent(uint256 _feePercent) external;

    function setProtocolSellFeePercent(uint256 _feePercent) external;

    function setCreatorBuyFeePercent(uint256 _feePercent) external;

    function setCreatorSellFeePercent(uint256 _feePercent) external ;

    function setOpenInit(bool isOpen) external;

    function getBuyPrice(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256);

    function getSellPrice(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256);

    function getBuyPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256);

    function getSellPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256);

    function createSharesForPiecewise(uint256 creatorId, uint256 idoPrice, uint256 idoAmount, uint sharesAmount, uint256 a, uint256 b, uint256 k) external;

    function buyShares(uint256 creatorId, uint256 amount) external payable;
    
    function sellShares(uint256[] memory tokenIds, uint256 priceLimit) external;
    
    function sellShare(uint256 tokenId, uint256 priceLimit) external;

    function claim() external;

    struct fees {
        uint256 price;
        uint256 protocolFee;
        uint256 creatorFee;
    }

    struct poolParams {
        uint256 idoPrice;
        uint256 idoAmount;
        uint256 sharesAmount;
        uint256 a;
        uint256 b;
        uint256 k;
    }
}
