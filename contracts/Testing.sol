// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Testing is Ownable {
    struct Plan {
        address merchant;
        string name;
        uint256 price;
        uint256 period;
    }

    struct Subscription {
        uint256 id;
        address customerAddress; // Added customerAddress field
        uint256 createdAt;
        uint256 updatedAt;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    Plan[] public plans;

    uint256 private planCounter;
    uint256 private subscriptionCounter;
    mapping(uint256 => Plan) private plansMap;

    function createPlan(
        string memory _name,
        uint256 _price,
        uint256 _period
    ) external {
        plansMap[planCounter++] = Plan({
            merchant: msg.sender,
            name: _name,
            price: _price,
            period: _period
        });
    }

    function getPlans() external view returns (Plan[] memory) {
        return plans;
    }
}
