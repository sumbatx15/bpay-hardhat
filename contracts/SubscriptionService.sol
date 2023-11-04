// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract SubscriptionService is Ownable {
    struct Plan {
        uint256 id;
        address merchant;
        string name;
        uint256 price;
        uint256 period;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    struct Subscription {
        uint256 id;
        address customerAddress; // Added customerAddress field
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private planCounter;
    uint256 private subscriptionCounter;
    uint256 private additionalServiceFee = 23000;

    mapping(uint256 => Plan) public plans;
    mapping(address => Plan[]) public merchantPlansMap;
    mapping(address => uint256) public merchantsServiceFeeBalance;

    mapping(uint256 => Subscription) public subscriptionsMap;
    mapping(uint256 => Subscription[]) public planSubscriptionsMap;

    event PlanCreated(uint256 indexed planId, address indexed merchant);
    event PlanRemoved(uint256 indexed planId, address indexed merchant);

    event Subscribed(address indexed customer, uint256 indexed planId);
    event Unsubscribed(address indexed customer, uint256 indexed planId);

    event PaymentFailed(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 amount,
        bytes reason
    );

    event PaymentFailedWithReason(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 amount,
        string reason
    );

    event PaymentTransferred(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 amount
    );

    event Executed(address indexed merchant, uint256 serviceFee);

    event ServiceFeeTransferred(
        address indexed merchant,
        address indexed reciver,
        uint256 amount
    );

    function addPlan(string memory name, uint256 price, uint256 period) public {
        uint256 planIndex = planCounter++;
        Plan memory newPlan = Plan(planIndex, msg.sender, name, price, period);
        merchantPlansMap[msg.sender].push(newPlan);
        plans[planIndex] = newPlan;

        emit PlanCreated(planIndex, msg.sender);
    }

    function getPlanById(uint256 planId) public view returns (Plan memory) {
        return plans[planId];
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
        return planSubscriptionsMap[planId];
    }

    function subscribe(uint256 planId) public {
        uint256 subId = subscriptionCounter++;
        Subscription memory newSubscription = Subscription(
            subId,
            msg.sender,
            block.timestamp,
            0
        );

        planSubscriptionsMap[planId].push(newSubscription);
        subscriptionsMap[subId] = newSubscription;

        emit Subscribed(msg.sender, planId);
    }

    function unsubscribe(uint256 planId) public {
        Subscription[] storage subs = planSubscriptionsMap[planId];

        for (uint256 i = 0; i < subs.length; i++) {
            if (subs[i].customerAddress == msg.sender) {
                subs[i] = subs[subs.length - 1];
                subs.pop();
                emit Unsubscribed(msg.sender, planId);
                break;
            }
        }
    }

    function execute(address merchant, IERC20 token) public {
        uint256 startGas = gasleft();
        Plan[] storage merchantPlans = merchantPlansMap[merchant];

        for (uint256 i = 0; i < merchantPlans.length; i++) {
            Plan storage plan = merchantPlans[i];

            Subscription[] storage subs = planSubscriptionsMap[plan.id];

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
                    } catch Error(string memory reason) {
                        emit PaymentFailedWithReason(
                            plan.id,
                            sub.customerAddress,
                            merchant,
                            plan.price,
                            reason
                        );
                    } catch (bytes memory reason) {
                        emit PaymentFailed(
                            plan.id,
                            sub.customerAddress,
                            merchant,
                            plan.price,
                            reason
                        );
                    }
                }
            }
        }

        uint256 endGas = gasleft();
        uint256 gasUsed = startGas - endGas;
        uint256 fee = (((gasUsed + 21000 + 21000) * 130) / 100) * tx.gasprice;

        require(
            fee <= merchantsServiceFeeBalance[merchant],
            "Insufficient funds"
        );

        payable(msg.sender).transfer(fee);
        merchantsServiceFeeBalance[merchant] -= fee;
        console.log("fee sc:", fee);

        emit ServiceFeeTransferred(merchant, msg.sender, fee);
    }

    function getMerchantPlans(
        address merchant
    ) public view returns (Plan[] memory) {
        return merchantPlansMap[merchant];
    }

    function getServiceFeeBalance(
        address merchant
    ) public view returns (uint256) {
        return merchantsServiceFeeBalance[merchant];
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
