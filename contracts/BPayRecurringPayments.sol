// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract BPayRecurringPayments is Ownable {
    constructor(address _initialOwner) Ownable(_initialOwner) {}

    struct Plan {
        uint256 id;
        address merchant;
        string name;
        uint256 price;
        uint256 period;
        uint256 trial;
        uint128 maxStrikes;
        uint128 extendPeriodOnStrike;
    }

    struct Subscription {
        uint256 id;
        uint256 planId;
        address customer;
        uint256 createdAt;
        uint256 updatedAt;
        address token;
    }
    event PlanCreated(uint256 indexed planId, address indexed merchant);
    event PlanRemoved(uint256 indexed planId, address indexed merchant);

    event Subscribed(
        address indexed customer,
        uint256 indexed planId,
        uint256 subscriptionId
    );
    event Unsubscribed(
        address indexed customer,
        uint256 indexed planId,
        uint256 subscriptionId
    );

    // whenever plan owner removes a subscription
    event SubscriptionCanceled(
        address indexed customer,
        uint256 indexed planId,
        uint256 subscriptionId
    );

    // whenever subscription is removed due to too many strikes
    event SubscriptionRemoved(
        address indexed customer,
        uint256 indexed planId,
        uint256 subscriptionId
    );

    event PaymentFailed(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 subscriptionId,
        uint256 amount,
        bytes reason
    );

    event PaymentFailedWithReason(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 subscriptionId,
        uint256 amount,
        string reason
    );

    event PaymentTransferred(
        uint256 indexed planId,
        address indexed customer,
        address indexed merchant,
        uint256 subscriptionId,
        uint256 amount
    );

    event Executed(address indexed merchant, uint256 serviceFee);

    event ServiceFeeTransferred(
        address indexed merchant,
        address indexed reciver,
        uint256 amount
    );

    Plan[] public plans;
    Subscription[] public subscriptions;

    // planId => token => bool
    mapping(uint256 => mapping(address => bool)) private planTokens;

    // merchant => balance
    mapping(address => uint256) public merchantsServiceFeeBalance;

    // subscriptionId => strikeCount
    mapping(uint256 => uint256) public strikes;

    function createPlan(
        string calldata _name,
        address[] calldata _token,
        uint256 _price,
        uint256 _period,
        uint256 _trial,
        uint128 _maxStrikes,
        uint128 _extendPeriodOnStrike
    ) external {
        uint256 planId = plans.length;
        plans.push(
            Plan({
                id: planId,
                merchant: msg.sender,
                name: _name,
                price: _price,
                period: _period,
                trial: _trial,
                maxStrikes: _maxStrikes,
                extendPeriodOnStrike: _extendPeriodOnStrike
            })
        );

        for (uint256 i = 0; i < _token.length; i++) {
            planTokens[planId][_token[i]] = true;
        }

        emit PlanCreated(planId, msg.sender);
    }

    function removePlan(uint256 _planId) external {
        require(
            plans[_planId].merchant == msg.sender,
            "Only the merchant can remove this plan"
        );
        delete plans[_planId];
        emit PlanRemoved(_planId, msg.sender);
    }

    function subscribe(uint256 _planId, address _token) external {
        require(
            plans[_planId].merchant != address(0),
            "This plan does not exist"
        );
        require(
            planTokens[_planId][_token],
            "This plan does not accept this token"
        );
        Plan memory plan = plans[_planId];
        uint256 subscriptionId = subscriptions.length;
        subscriptions.push(
            Subscription({
                id: subscriptionId,
                planId: _planId,
                customer: msg.sender,
                createdAt: block.timestamp,
                updatedAt: plan.trial > 0
                    ? block.timestamp - plan.period + plan.trial
                    : 0,
                token: _token
            })
        );

        emit Subscribed(msg.sender, _planId, subscriptionId);
    }

    function unsubscribe(uint256 _subscriptionId) external {
        require(
            subscriptions[_subscriptionId].customer == msg.sender,
            "Only the customer can unsubscribe"
        );
        delete subscriptions[_subscriptionId];
    }

    function cancelSubscription(uint256 _subscriptionId) external {
        require(
            plans[subscriptions[_subscriptionId].planId].merchant == msg.sender,
            "Only the owner of the plan can cancel this subscription"
        );
        delete subscriptions[_subscriptionId];
        emit SubscriptionCanceled(
            msg.sender,
            subscriptions[_subscriptionId].planId,
            _subscriptionId
        );
    }

    function removeSubscription(uint256 _subscriptionId) public {
        require(
            strikes[_subscriptionId] >=
                plans[subscriptions[_subscriptionId].planId].maxStrikes,
            "Subscription does not have enough strikes"
        );
        delete subscriptions[_subscriptionId];
        emit SubscriptionRemoved(
            msg.sender,
            subscriptions[_subscriptionId].planId,
            _subscriptionId
        );
    }

    function getPlans() external view returns (Plan[] memory) {
        return plans;
    }

    function getPlanById(uint256 _planId) external view returns (Plan memory) {
        return plans[_planId];
    }

    function getSubscriptions() external view returns (Subscription[] memory) {
        return subscriptions;
    }

    function getPlanSubscriptions(
        uint256 _planId
    ) external view returns (Subscription[] memory) {
        uint256 total = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].planId == _planId) {
                total++;
            }
        }

        Subscription[] memory subs = new Subscription[](total);
        uint256 index = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].planId == _planId) {
                subs[index] = subscriptions[i];
                index++;
            }
        }

        return subs;
    }

    function getSubscriptionsByMerchant(
        address merchant
    ) external view returns (Subscription[] memory) {
        uint256 total = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (plans[subscriptions[i].planId].merchant == merchant) {
                total++;
            }
        }

        Subscription[] memory subs = new Subscription[](total);
        uint256 index = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (plans[subscriptions[i].planId].merchant == merchant) {
                subs[index] = subscriptions[i];
                index++;
            }
        }

        return subs;
    }

    function getCustomerSubscriptions(
        address customer
    ) external view returns (Subscription[] memory) {
        uint256 total = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].customer == customer) {
                total++;
            }
        }

        Subscription[] memory subs = new Subscription[](total);
        uint256 index = 0;
        for (uint256 i = 0; i < subscriptions.length; i++) {
            if (subscriptions[i].customer == customer) {
                subs[index] = subscriptions[i];
                index++;
            }
        }

        return subs;
    }

    function execute(
        address merchant,
        uint256[] calldata _planIds,
        uint256[][] calldata _subscriptionIds
    ) external {
        uint256 startGas = gasleft();

        for (uint256 i = 0; i < _planIds.length; i++) {
            Plan memory plan = plans[i];
            if (plan.merchant != merchant) continue;
            uint256[] memory subIds = _subscriptionIds[i];

            for (uint256 j = 0; j < subIds.length; j++) {
                bool errored = false; // flag to track if an error happened
                Subscription storage sub = subscriptions[j];
                IERC20 token = IERC20(sub.token);
                uint64 diff = uint64(block.timestamp - sub.updatedAt);
                if (diff >= plan.period) {
                    try
                        token.transferFrom(
                            sub.customer,
                            plan.merchant,
                            plan.price
                        )
                    {
                        sub.updatedAt = uint64(block.timestamp);
                        emit PaymentTransferred(
                            plan.id,
                            sub.customer,
                            plan.merchant,
                            sub.id,
                            plan.price
                        );
                    } catch Error(string memory reason) {
                        errored = true;
                        emit PaymentFailedWithReason(
                            plan.id,
                            sub.customer,
                            plan.merchant,
                            sub.id,
                            plan.price,
                            reason
                        );
                    } catch (bytes memory reason) {
                        errored = true;
                        emit PaymentFailed(
                            plan.id,
                            sub.customer,
                            plan.merchant,
                            sub.id,
                            plan.price,
                            reason
                        );
                    }
                }
                if (errored) {
                    if (strikes[sub.id] < plan.maxStrikes) {
                        strikes[sub.id]++;
                        sub.updatedAt += plan.extendPeriodOnStrike;
                    } else {
                        removeSubscription(sub.id);
                    }
                } else {
                    if (strikes[sub.id] > 0) strikes[sub.id] = 0;
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

        emit ServiceFeeTransferred(merchant, msg.sender, fee);
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
}
