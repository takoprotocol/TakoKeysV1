// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.17;


import "./access/Ownable.sol";
import "./assets/FarcasterKey.sol";
import "./interfaces/IIdRegistry.sol";
import "./interfaces/IFarcasterKey.sol";
import "./interfaces/ITakoKeysV1.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

contract TakoKeysV1 is ITakoKeysV1, Ownable, ReentrancyGuard {
    IFarcasterKey public immutable farcasterKey;
    IIdRegistry public immutable farcasterHub;

    bool public isOpenInit;
    address public protocolFeeDestination;
    uint256 public protocolBuyFeePercent;
    uint256 public protocolSellFeePercent;
    uint256 public creatorBuyFeePercent;
    uint256 public creatorSellFeePercent;
    uint256 public constant MAX_FEE_PERCENT = 1 ether / 10; 

    mapping(uint256 => uint256) public sharesSupply;
    mapping(uint256 => uint256) public moneySupply;
    mapping(address => uint256) public userClaimable;

    mapping(uint256 => poolParams) public poolInfo;

    event SetFeeTo(address feeTo);
    event SetProtocolBuyFee(uint256 protocolBuyFeePercent);
    event SetProtocolSellFee(uint256 protocolSellFeePercent);
    event SetCreatorBuyFee(uint256 creatorBuyFeePercent);
    event SetCreatorSellFee(uint256 creatorSellFeePercent);
    event SetOpenInit(bool isOpenInit);
    event TradeEvent(
        address trader,
        uint256 creatorId,
        bool isBuy,
        uint256 shareAmount,
        uint256[] tokenIds,
        fees fees,
        uint256 supply
    );
    event CreateShares(uint256 creatorId, uint256 supplyAmount, uint256 totalPrice);
    event ClaimEvent(address indexed user, uint fee);

    constructor(IIdRegistry _farcasterHub) {
        require(address(_farcasterHub) != address(0), "invalid farcaster address");

        farcasterKey = new FarcasterKey(msg.sender);
        farcasterHub = _farcasterHub;
        protocolFeeDestination = msg.sender;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function setFeeDestination(address _feeDestination) external onlyOwner {
        protocolFeeDestination = _feeDestination;
        emit SetFeeTo(_feeDestination);
    }

    function setProtocolBuyFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Invalid fee parameter");
        protocolBuyFeePercent = _feePercent;
        emit SetProtocolBuyFee(_feePercent);
    }

    function setProtocolSellFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Invalid fee parameter");
        protocolSellFeePercent = _feePercent;
        emit SetProtocolSellFee(_feePercent);
    }

    function setCreatorBuyFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Invalid fee parameter");
        creatorBuyFeePercent = _feePercent;
        emit SetCreatorBuyFee(_feePercent);
    }

    function setCreatorSellFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Invalid fee parameter");
        creatorSellFeePercent = _feePercent;
        emit SetCreatorSellFee(_feePercent);
    }

    function setOpenInit(bool isOpen) external onlyOwner {
        isOpenInit = isOpen;
        emit SetOpenInit(isOpen);
    }

    function getBuyPrice(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256) {
        return _getBuyPriceByPiecewise(creatorId, amount);
    }

    function getSellPrice(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256) {
        return _getSellPriceByPiecewise(creatorId, amount);
    }

    function getBuyPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256) {
        uint256 price = _getBuyPriceByPiecewise(creatorId, amount);
        uint256 protocolFee = (price * protocolBuyFeePercent) / 1 ether;
        uint256 creatorFee = (price * creatorBuyFeePercent) / 1 ether;
        return price + protocolFee + creatorFee;
    }

    function getSellPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) public view returns (uint256) {
        uint256 price = _getSellPriceByPiecewise(creatorId, amount);
        uint256 protocolFee = (price * protocolSellFeePercent) / 1 ether;
        uint256 creatorFee = (price * creatorSellFeePercent) / 1 ether;
        return price - protocolFee - creatorFee;
    }

    function createSharesForPiecewise(uint256 creatorId, uint256 idoPrice, uint256 idoAmount, uint sharesAmount, uint256 a, uint256 b, uint256 k) external {
        require(isOpenInit == true, 'create shares not start');
        address creator = _getCreatorById(creatorId);
        //TODO: verification for params
        poolInfo[creatorId] = poolParams(idoPrice, idoAmount, sharesAmount, a, b ,k);
        //TODO: event emit
    }

    function buyShares(uint256 creatorId, uint256 amount) external payable nonReentrant() {
        address creator = _getCreatorById(creatorId);
        console.log("creatorId: (buy)");
        console.log(creatorId);
        uint256 supply = sharesSupply[creatorId];
        //TODO: params verification
        fees memory fee = _calculateFeesForPiecewise(creatorId, amount, true);
        console.log("price should be:");
        console.log(fee.price);
        require(msg.value >= fee.price , "Insufficient payment");
        sharesSupply[creatorId] += amount;
        userClaimable[creator] += fee.creatorFee;
        uint256[] memory tokenIds = farcasterKey.mint(
            msg.sender, 
            amount, 
            creatorId
        );
        for(uint256 i = tokenIds.length; i > 0; i--){
            console.log("Id for NFT:");
            console.log(tokenIds[i - 1]);
        }
        (bool success, ) = protocolFeeDestination.call{value: fee.protocolFee}("");
        require(success, "Unable to send funds");
        emit TradeEvent(
            msg.sender,
            creatorId,
            true,
            amount,
            tokenIds,
            fee,
            supply + amount
        );
    }

    function _sellShares(uint256[] memory tokenIds, uint256 priceLimit) internal {
        uint256 length = tokenIds.length;
        require(length > 0, "Insufficient shares");
        uint256 creatorId = farcasterKey.creatorIdOf(tokenIds[0]);
        console.log("creatorId: (sell)");
        console.log(creatorId);
        uint256[] memory creatorIds = new uint256[](length);
        creatorIds[0] = creatorId;
        for (uint256 i = 0; i < length; ) {
            require(
                farcasterKey.ownerOf(tokenIds[i]) == msg.sender,
                "Seller is not token owner"
            );
            if (i > 0) {
                uint256 nthCreatorId = farcasterKey.creatorIdOf(tokenIds[i]);
                creatorIds[i] = nthCreatorId;

                if (creatorId != 0 && nthCreatorId != creatorId) {
                    creatorId = 0;
                }
            }
            farcasterKey.burn(tokenIds[i]);
            unchecked {
                ++i;
            }
        }
        if (creatorId != 0) {
            uint256 resultValue = _sellShare(creatorId, tokenIds);
            console.log("sell value");
            console.log(resultValue);
            require(resultValue >= priceLimit, "price not in the range");
        } else {
            uint256 resultValue = 0;
            for (uint256 i = 0; i < length; ) {
                uint[] memory sellTokenIds = new uint256[](1);
                sellTokenIds[0] = tokenIds[i];
                resultValue += _sellShare(creatorIds[i], sellTokenIds);
                unchecked {
                    ++i;
                }
            }
            console.log("sell value");
            console.log(resultValue);
            require(resultValue >= priceLimit, "price not in the range");
        }
    }

    function _sellShare(uint256 creatorId, uint256[] memory tokenIds) internal returns (uint256){
        fees memory fee = _calculateFeesForPiecewise(creatorId, tokenIds.length, false);
        sharesSupply[creatorId] -= tokenIds.length;
        address creator = _getCreatorById(creatorId);
        userClaimable[creator] += fee.creatorFee;
        require(sendFunds(msg.sender, fee.price, fee.protocolFee, fee.creatorFee), "send funds failed");
        emit TradeEvent(msg.sender, creatorId, false, tokenIds.length, tokenIds, fee, sharesSupply[creatorId]);
        console.log("sell fee price");
        console.log(fee.price);
        return fee.price - fee.protocolFee - fee.creatorFee;
    }

    function _calculateFeesForPiecewise(uint256 creatorId, uint256 amount, bool isBuy) internal view returns (fees memory) {
        if(isBuy){
            console.log("calculate fee for buy");
            console.log(amount);
            uint256 price = _getBuyPriceByPiecewise(creatorId, amount);
            return fees(price, (price * protocolBuyFeePercent) / 1 ether, (price * creatorBuyFeePercent) / 1 ether);
        }else{
            console.log("calculate fee for sell");
            console.log(amount);
            //TODO: sell fee should minus by
            uint256 price = _getSellPriceByPiecewise(creatorId, amount);
            return fees(price, (price * protocolSellFeePercent) / 1 ether, (price * creatorSellFeePercent) / 1 ether);
        }
    }

    function sendFunds(address sender, uint256 price, uint256 protocolFee, uint256 creatorFee) internal returns (bool) {
        (bool success0, ) = sender.call{value: price - protocolFee - creatorFee}("");
        (bool success1, ) = protocolFeeDestination.call{value: protocolFee}("");
        return success0 && success1;
    }

    function sellShare(uint256 tokenId, uint256 priceLimit) external nonReentrant() {
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        _sellShares(tokenIds, priceLimit);
    }

    function sellShares(uint256[] memory tokenIds, uint256 priceLimit) external nonReentrant(){
        _sellShares(tokenIds, priceLimit);
    }

    function claim() external nonReentrant {
        uint256 claimable = userClaimable[msg.sender];
        console.log("claimable:");
        console.log(claimable);
        console.log("Balance");
        console.log(address(this).balance);
        require(claimable > 0, "Zero claimable");
        userClaimable[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: claimable}("");
        require(success, "Unable to claim");
        emit ClaimEvent(msg.sender, claimable);
    }

    function _getBuyPriceByPiecewise(uint256 creatorId, uint256 amount) internal view returns (uint256) {
        uint256 supply = sharesSupply[creatorId];
        poolParams memory info = poolInfo[creatorId];
        console.log("ido amount");
        console.log(info.idoAmount);
        console.log("supply for buy");
        console.log(supply);
        uint256 price = 0;
        if(supply + amount <= info.idoAmount){
            price = _getPriceOnConstant(amount, info);
        }else if(supply >= info.idoAmount){
            price = _getPriceOnCurve(supply, amount, info);
        }else{
            uint256 amountForCurve = amount + supply - info.idoAmount;
            uint256 amountForConstant =  amount + supply - amountForCurve;
            uint256 constantPrice = _getPriceOnConstant(amountForConstant, info);
            uint256 curvePrice = _getPriceOnCurve(info.idoAmount, amountForCurve, info);
            price = constantPrice + curvePrice;
        }
        return price;
    }

    function _getSellPriceByPiecewise(uint256 creatorId, uint256 amount) internal view returns (uint256) {
        uint256 supply = sharesSupply[creatorId];
        console.log("supply for sell");
        console.log(supply);
        poolParams memory info = poolInfo[creatorId];
        uint256 price = 0;
        if(supply <= info.idoAmount){
            price = _getPriceOnConstant(amount, info);
        }else if(supply - amount >= info.idoAmount) {
            price = _getPriceOnCurve(supply - amount, amount, info);
        }else{
            uint256 amountForCurve = supply - info.idoAmount;
            uint256 amountForConstant = amount - amountForCurve;
            uint256 curvePrice = _getPriceOnCurve(info.idoAmount, amountForCurve, info);
            uint256 constantPrice = _getPriceOnConstant(amountForConstant, info);
            price = curvePrice + constantPrice;
        }
        return price;
    }

    function _getPriceOnCurve(uint256 supplyAmount, uint256 changeAmount, poolParams memory info) internal view returns (uint256){
        console.log("curve amount");
        console.log(changeAmount);
        uint256 sum1 = 
        info.a * ( supplyAmount * (supplyAmount + 1) * (2 * supplyAmount + 1))/6 +
        info.b * ( supplyAmount * (supplyAmount + 1) / 2) +
        info.k * supplyAmount;
        console.log("sum1");
        console.log(sum1);
        supplyAmount += changeAmount;
        uint256 sum2 =
        info.a * ( supplyAmount * (supplyAmount + 1) * (2 * supplyAmount + 1))/6 +
        info.b * ( supplyAmount * (supplyAmount + 1) / 2) +
        info.k * supplyAmount;
        console.log("sum2");
        console.log(sum2);
        return sum2 - sum1;
    }

    function _getPriceOnConstant(uint256 changeAmount, poolParams memory info) internal view returns (uint256){
        console.log("Constant amount");
        console.log(changeAmount);
        return changeAmount * info.idoPrice; 
    }

    function _getCreatorById(
        uint256 creatorId
    ) internal view returns (address) {
        address creator = farcasterHub.recoveryOf(creatorId);
        require(creator != address(0), "Creator can not be zero");
        return creator;
    }
}
