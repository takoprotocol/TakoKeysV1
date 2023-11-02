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

    mapping(uint256 => uint256) public sharesSupply;
    mapping(uint256 => uint256) public moneySupply;
    mapping(address => uint256) public userClaimable;

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
        protocolBuyFeePercent = _feePercent;
        emit SetProtocolBuyFee(_feePercent);
    }

    function setProtocolSellFeePercent(uint256 _feePercent) external onlyOwner {
        protocolSellFeePercent = _feePercent;
        emit SetProtocolSellFee(_feePercent);
    }

    function setCreatorBuyFeePercent(uint256 _feePercent) external onlyOwner {
        creatorBuyFeePercent = _feePercent;
        emit SetCreatorBuyFee(_feePercent);
    }

    function setCreatorSellFeePercent(uint256 _feePercent) external onlyOwner {
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
        return _getBuyPrice(creatorId, amount);
    }

    function getSellPrice(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256) {
        return _getSellPrice(creatorId, amount);
    }

    function getBuyPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) external view returns (uint256) {
        uint256 price = _getBuyPrice(creatorId, amount);
        uint256 protocolFee = (price * protocolBuyFeePercent) / 1 ether;
        uint256 creatorFee = (price * creatorBuyFeePercent) / 1 ether;
        return price + protocolFee + creatorFee;
    }

    function getSellPriceAfterFee(
        uint256 creatorId,
        uint256 amount
    ) public view returns (uint256) {
        uint256 price = _getSellPrice(creatorId, amount);
        uint256 protocolFee = (price * protocolSellFeePercent) / 1 ether;
        uint256 creatorFee = (price * creatorSellFeePercent) / 1 ether;
        return price - protocolFee - creatorFee;
    }

    function createShares(uint256 creatorId, uint256 supplyAmount, uint256 totalPrice) public  payable {
        uint256 supply = sharesSupply[creatorId];
        address creator = _getCreatorById(creatorId);
        require(supply == 0 && msg.sender == creator, "supply has been created");
        sharesSupply[creatorId] = supplyAmount;
        moneySupply[creatorId] = totalPrice;
        emit CreateShares(creatorId, supplyAmount, totalPrice);
    }

    function buySharesByAMM(uint256 creatorId, uint256 supplyAmount) public payable nonReentrant{
        address creator = _getCreatorById(creatorId);
        uint256 supply = sharesSupply[creatorId];
        uint256 money = moneySupply[creatorId];
        uint256 afterSupply = supply - supplyAmount;
        require(afterSupply > 0 && supplyAmount > 0, "Incorrect input number");
        fees memory fee = _calculateFees(supply, money, supplyAmount, true);
        require( msg.value >= fee.price + fee.protocolFee + fee.creatorFee, "Insufficient payment" );
        sharesSupply[creatorId] = afterSupply;
        moneySupply[creatorId] += fee.price;
        uint256[] memory tokenIds = farcasterKey.mint(
            msg.sender,
            supplyAmount,
            creatorId
        );
        (bool success, ) = protocolFeeDestination.call{value: fee.protocolFee}("");
        userClaimable[creator] += fee.creatorFee;
        require(success, "Unable to send funds");
        emit TradeEvent(
            msg.sender,
            creatorId,
            true,
            supplyAmount,
            tokenIds,
            fee,
            afterSupply
        );
    }

    function _sellSharesbyAMM(uint256[] memory tokenIds, uint256 priceLimit) internal {
        uint256 length = tokenIds.length;
        require(length > 0, "TokenIds cannot be empty");
        uint256 creatorId = farcasterKey.creatorIdOf(tokenIds[0]);
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
            uint256 resultValue = _sellbyAMM(creatorId, tokenIds);
            require(resultValue >= priceLimit, "price not in the range");
        } else {
            uint256 resultValue = 0;
            for (uint256 i = 0; i < length; ) {
                uint[] memory sellTokenIds = new uint256[](1);
                sellTokenIds[0] = tokenIds[i];
                resultValue += _sellbyAMM(creatorIds[i], sellTokenIds);
                unchecked {
                    ++i;
                }
            }
            require(resultValue >= priceLimit, "price not in the range");
        }
    }

    function _sellbyAMM(uint256 creatorId, uint256[] memory tokenIds) internal returns (uint256){
        uint256 supply = sharesSupply[creatorId];
        require(supply > tokenIds.length, "Insufficient shares");
        uint256 money = moneySupply[creatorId];
        fees memory fee = _calculateFees(supply, money, tokenIds.length, false);
        sharesSupply[creatorId] += tokenIds.length;
        address creator = _getCreatorById(creatorId);
        userClaimable[creator] += fee.creatorFee;
        require(sendFunds(msg.sender, fee.price, fee.protocolFee, fee.creatorFee), "send funds failed");
        emit TradeEvent(msg.sender, creatorId, false, tokenIds.length, tokenIds, fee, sharesSupply[creatorId]);
        return fee.price - fee.protocolFee - fee.creatorFee;
    }

    function _calculateFees(uint256 supply, uint256 money, uint256 supplyChangeAmount, bool isBuy) internal view returns (fees memory) {
        if(isBuy){
            uint256 price = supply * money /(supply - supplyChangeAmount) - money;
            //console.log("buy price:");
            //console.log(price);
            uint256 protocolFee = (price * protocolBuyFeePercent) / 1 ether;
            uint256 creatorFee = (price * creatorBuyFeePercent) / 1 ether;
            return fees(price, protocolFee, creatorFee);
        }else{
            uint256 price = money - supply * money / (supply + supplyChangeAmount);
            //console.log("sell price");
            //console.log(price);
            uint256 protocolFee = (price * protocolSellFeePercent) / 1 ether;
            uint256 creatorFee = (price * creatorSellFeePercent) / 1 ether;
            return fees(price, protocolFee, creatorFee);
        }
    }

    function sendFunds(address sender, uint256 price, uint256 protocolFee, uint256 creatorFee) internal returns (bool) {
        (bool success0, ) = sender.call{value: price - protocolFee - creatorFee}("");
        (bool success1, ) = protocolFeeDestination.call{value: protocolFee}("");
        return success0 && success1;
    }

    function sellShareByAMM(uint256 tokenId, uint256 priceLimit) external nonReentrant() {
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        _sellSharesbyAMM(tokenIds, priceLimit);
    }

    function sellSharesByAMM(uint256[] memory tokenIds, uint256 priceLimit) external nonReentrant(){
        _sellSharesbyAMM(tokenIds, priceLimit);
    }

    function claim() external nonReentrant {
        require(userClaimable[msg.sender] > 0, "Zero claimable");
        uint256 claimable = userClaimable[msg.sender];
        //console.log("claimable");
        //console.log(claimable);
        userClaimable[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: claimable}("");
        require(success, "Unable to claim");
        emit ClaimEvent(msg.sender, claimable);
    }

    function _getBuyPrice(uint256 creatorId, uint256 amount) internal view returns (uint256){
        uint256 supply = sharesSupply[creatorId];
        uint256 money = moneySupply[creatorId];
        if(supply > 0 && money > 0){
            return supply * money / (supply - amount) - money;
        }
        return 0;
    }

    function _getSellPrice(uint256 creatorId, uint256 amount) internal view returns (uint256){
        uint256 supply = sharesSupply[creatorId];
        uint256 money = moneySupply[creatorId];
        if(supply > 0 && money > 0){
            return money - supply * money / (supply + amount);
        }
        return 0;
    }

    function _getCreatorById(
        uint256 creatorId
    ) internal view returns (address) {
        address creator = farcasterHub.recoveryOf(creatorId);
        require(creator != address(0), "Creator can not be zero");
        return creator;
    }
}
