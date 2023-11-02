// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Testing is Ownable {
    struct Plan {
        uint256 id;
        address merchant;
        string name;
        IERC20 token;
        uint256 price;
        uint256 period;
    }

    struct Subscription {
        uint256 id;
        address customer;
        uint256 createdAt;
        uint256 updatedAt;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    Plan[] public plans;
    mapping(uint256 => Subscription[]) public subscriptionsByPlanId;

    uint256 private planCounter = 0;
    uint256 private subscriptionCounter;

    function createPlan(
        string calldata _name,
        address _token,
        uint256 _price,
        uint256 _period
    ) external {
        plans.push(
            Plan({
                id: plans.length,
                merchant: msg.sender,
                name: _name,
                token: IERC20(_token),
                price: _price,
                period: _period
            })
        );
    }

    function removePlan(uint256 _planId) external {
        require(
            plans[_planId].merchant == msg.sender,
            "Only the merchant can remove this plan"
        );
        delete plans[_planId];
    }

    function getPlans() external view returns (Plan[] memory) {
        return plans;
    }

    function getPlanById(uint256 _planId) external view returns (Plan memory) {
        return plans[_planId];
    }

    function execute(uint256 _planId, uint256[] calldata _subIndexes) external {
        Plan memory plan = plans[_planId];
        require(
            plan.merchant == msg.sender,
            "Only the merchant can execute this plan"
        );
        for (uint256 i = 0; i < _subIndexes.length; i++) {
            Subscription memory sub = subscriptionsByPlanId[_planId][
                _subIndexes[i]
            ];
            require(sub.customer != address(0), "Subscription does not exist");
            require(
                sub.updatedAt + plan.period < block.timestamp,
                "Subscription is not due"
            );
            sub.updatedAt = block.timestamp;
            subscriptionsByPlanId[_planId][_subIndexes[i]] = sub;
        }
    }
}
