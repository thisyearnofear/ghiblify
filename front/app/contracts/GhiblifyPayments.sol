// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GhiblifyPaymentsL2 is Ownable {
    using SafeERC20 for IERC20;

    // Celo L2 cUSD address (verify this is correct)
    IERC20 public constant CUSD_TOKEN = IERC20(0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1);

    mapping(string => uint256) public packagePrices;

    event CreditsPurchased(
        address indexed buyer,
        string packageTier,
        uint256 amount,
        uint256 credits,
        uint256 timestamp
    );

    event Withdrawal(
        address indexed recipient,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {
        // Verify cUSD contract existence on L2
        require(
            address(CUSD_TOKEN).code.length > 0 && 
            CUSD_TOKEN.totalSupply() > 0,
            "Invalid cUSD token"
        );

        // Initialize package prices
        packagePrices["starter"] = 0.35 ether;  // 0.35 cUSD
        packagePrices["pro"] = 3.5 ether;     // 3.5 cUSD
        packagePrices["don"] = 7 ether;   // 7 cUSD
    }

    function getPackagePrice(string memory packageTier) public view returns (uint256) {
        bytes32 tierHash = keccak256(bytes(packageTier));
        require(tierHash == keccak256("starter") ||
                tierHash == keccak256("pro") ||
                tierHash == keccak256("don"), 
                "Invalid tier");
        return packagePrices[packageTier];
    }

    function purchaseCredits(string calldata packageTier) external {
        uint256 amount = getPackagePrice(packageTier);
        uint256 credits = _calculateCredits(packageTier, amount);
        
        require(credits > 0, "Invalid payment");
        require(
            CUSD_TOKEN.allowance(msg.sender, address(this)) >= amount,
            "Insufficient allowance"
        );

        CUSD_TOKEN.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit CreditsPurchased(
            msg.sender,
            packageTier,
            amount,
            credits,
            block.timestamp
        );
    }

    function _calculateCredits(string memory tier, uint256 amount) 
        internal pure returns (uint256) 
    {
        bytes32 tierHash = keccak256(bytes(tier));
        uint256 tolerance = amount / 1000;
        
        if (tierHash == keccak256("starter")) {
            return _isWithinTolerance(amount, 0.35 ether, tolerance) ? 1 : 0;
        }
        if (tierHash == keccak256("pro")) {
            return _isWithinTolerance(amount, 3.5 ether, tolerance) ? 12 : 0;
        }
        if (tierHash == keccak256("don")) {
            return _isWithinTolerance(amount, 7 ether, tolerance) ? 30 : 0;
        }
        return 0;
    }

    function _isWithinTolerance(
        uint256 value,
        uint256 target,
        uint256 tolerance
    ) internal pure returns (bool) {
        return value >= target - tolerance && value <= target + tolerance;
    }

    // Direct withdrawal function
    function withdrawCUSD(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        CUSD_TOKEN.safeTransfer(to, amount);
        emit Withdrawal(to, amount);
    }

    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return CUSD_TOKEN.balanceOf(address(this));
    }

    // Update package prices
    function setPackagePrice(string memory packageTier, uint256 price) external onlyOwner {
        require(price > 0, "Price must be greater than 0");
        packagePrices[packageTier] = price;
    }
}
