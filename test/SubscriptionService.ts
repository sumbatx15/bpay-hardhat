import { expect, util } from "chai";
import { ContractTransactionReceipt } from "ethers";
import { ethers } from "hardhat";

describe("SubscriptionService", function () {
  let subContract: Awaited<ReturnType<typeof deploySubscriptionService>>;
  let tokenContract: Awaited<ReturnType<typeof deployBPayToken>>;

  const deploySubscriptionService = async function () {
    const [owner] = await ethers.getSigners();
    const SubscriptionService = await ethers.getContractFactory(
      "SubscriptionService"
    );
    return await SubscriptionService.deploy(owner.address);
  };

  const deployBPayToken = async function () {
    const [owner] = await ethers.getSigners();
    const BPayToken = await ethers.getContractFactory("BPayMoney");
    return await BPayToken.connect(owner).deploy();
  };

  const getRestAccounts = async () => {
    const [owner, ...users] = await ethers.getSigners();
    return users;
  };

  before(async function () {
    subContract = await deploySubscriptionService();
    tokenContract = await deployBPayToken();

    const accounts = await ethers.getSigners();

    for (let account of accounts) {
      const token = tokenContract.connect(account);
      if (accounts.indexOf(account) != 0) {
        await token.mint(account.address);
      }
      token.approve(subContract.getAddress(), "1000000000000000000000");
    }
  });

  it("Every account should have 1000 tokens", async function () {
    const accounts = await ethers.getSigners();

    for (let account of accounts) {
      const balance = await tokenContract.balanceOf(account.address);
      expect(balance).to.equal("1000000000000000000000");
    }
  });

  it("Every account should approve subscription service", async function () {
    const accounts = await ethers.getSigners();

    for (let account of accounts) {
      const allowance = await tokenContract.allowance(
        account.address,
        subContract.getAddress()
      );
      expect(allowance).to.equal("1000000000000000000000");
    }
  });

  it(`Create two plans`, async function () {
    const [owner] = await ethers.getSigners();

    const plansData = [
      { name: "plan1", amount: "19900000000000000000", duration: 5 },
      { name: "plan2", amount: "19900000000000000000", duration: 5 },
    ];

    for (let plan of plansData) {
      const tx = await subContract
        .connect(owner)
        .addPlan(plan.name, plan.amount, plan.duration);
      await tx.wait();
    }

    const plans = await subContract.connect(owner).getPlans();
    expect(plans.length).to.equal(plansData.length);
  });

  it("Users subscribe to created plans", async function () {
    const users = await getRestAccounts();

    const plans = await subContract.getPlans();

    for (let plan of plans) {
      for (let user of users) {
        const tx = await subContract.connect(user).subscribe(plan.id);
        await tx.wait();
      }

      const subs = await subContract.getSubscriptions(plan.id);
      expect(subs.length).to.equal(users.length);
    }
  });

  it("Runner should transfer tokens from users to plan owner", async function () {
    const [owner, ...users] = await ethers.getSigners();

    const tx = await subContract.execute(
      owner.address,
      tokenContract.getAddress(),
      {
        gasPrice: 30000000000n,
      }
    );
    const result = await tx.wait();

    if (result?.gasUsed && result?.gasPrice) {
      console.log(
        "total fee in ether:",
        ethers.formatEther(result?.gasUsed * result?.gasPrice * 1800n)
      );
    }
  });

  // it("Check gas cost", async function () {
  //   const [owner] = await ethers.getSigners();
  // });
});
