// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract SubscriptionService is Ownable {
    struct Plan {
        uint256 id;
        string name;
        uint256 price;
        uint256 period;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    struct Subscription {
        address customerAddress; // Added customerAddress field
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private planCounter;

    mapping(uint256 => Plan) public plans;
    mapping(address => Plan[]) public merchantPlansMap;
    mapping(address => uint256) public merchantsServiceFeeBalance;
    mapping(uint256 => Subscription[]) public subscriptions;

    event PlanCreated(uint256 indexed planId, address indexed merchant);
    event PlanRemoved(uint256 indexed planId, address indexed merchant);

    event Subscribed(address indexed customer, uint256 indexed planId);
    event Unsubscribed(address indexed customer, uint256 indexed planId);

    event PaymentFailed(address indexed customer, uint256 indexed planId);
    event PaymentTransferred(
        uint256 indexed planId,
        address indexed customerAddress,
        address indexed merchantAddress,
        uint256 amount
    );

    function addPlan(string memory name, uint256 price, uint256 period) public {
        uint256 planIndex = planCounter++;
        merchantPlansMap[msg.sender].push(Plan(planIndex, name, price, period));

        emit PlanCreated(planIndex, msg.sender);
    }

    function removePlan(uint256 planId) public {
        Plan[] storage merchantPlans = merchantPlansMap[msg.sender];

        for (uint256 i = 0; i < merchantPlans.length; i++) {
            if (merchantPlans[i].id == planId) {
                merchantPlans[i] = merchantPlans[merchantPlans.length - 1];
                merchantPlans.pop();
                emit PlanRemoved(planId, msg.sender);
                break;
            }
        }
    }

    function getPlans() public view returns (Plan[] memory) {
        return merchantPlansMap[msg.sender];
    }

    function getSubscriptions(
        uint256 planId
    ) public view returns (Subscription[] memory) {
        return subscriptions[planId];
    }

    function subscribe(uint256 planId) public {
        Subscription memory newSubscription = Subscription(
            msg.sender,
            block.timestamp,
            0
        );
        subscriptions[planId].push(newSubscription);
        emit Subscribed(msg.sender, planId);
    }

    function unsubscribe(uint256 planId) public {
        Subscription[] storage subs = subscriptions[planId];

        for (uint256 i = 0; i < subs.length; i++) {
            if (subs[i].customerAddress == msg.sender) {
                subs[i] = subs[subs.length - 1];
                subs.pop();
                break;
            }
        }
    }

    function execute(address merchant, IERC20 token) external {
        Plan[] storage merchantPlans = merchantPlansMap[merchant];
        console.log("merchantPlans:", merchantPlans.length);

        for (uint256 i = 0; i < merchantPlans.length; i++) {
            Plan storage plan = merchantPlans[i];

            Subscription[] storage subs = subscriptions[plan.id];
            console.log("subs:", subs.length);

            for (uint256 j = 0; j < subs.length; j++) {
                Subscription storage sub = subs[j];
                uint64 diff = uint64(block.timestamp - sub.updatedAt);

                if (diff >= plan.period) {
                    try
                        token.transferFrom(
                            sub.customerAddress,
                            merchant,
                            plan.price
                        )
                    {
                        sub.updatedAt = uint64(block.timestamp);
                        emit PaymentTransferred(
                            plan.id,
                            sub.customerAddress,
                            merchant,
                            plan.price
                        );
                    } catch {
                        emit PaymentFailed(sub.customerAddress, plan.id);
                    }
                }
            }
        }
    }

    function getMerchantPlans(
        address merchant
    ) public view returns (Plan[] memory) {
        return merchantPlansMap[merchant];
    }

    function depositServiceFee() public payable {
        require(msg.value > 0, "Must send a positive amount");
        merchantsServiceFeeBalance[msg.sender] += msg.value;
    }

    function withdrawServiceFee(uint256 amount) public {
        require(
            amount <= merchantsServiceFeeBalance[msg.sender],
            "Insufficient funds"
        );
        payable(msg.sender).transfer(amount);
        merchantsServiceFeeBalance[msg.sender] -= amount;
    }

    receive() external payable {}
}
