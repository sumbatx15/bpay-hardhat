import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect, util } from "chai";
import { ContractTransactionReceipt } from "ethers";
import { ethers } from "hardhat";

describe("Testing", function () {
  let contract: Awaited<ReturnType<typeof deploySubscriptionService>>;

  const deploySubscriptionService = async function () {
    const [owner] = await ethers.getSigners();
    const SubscriptionService = await ethers.getContractFactory("Testing");
    return await SubscriptionService.deploy(owner.address);
  };

  const addPlan = async (account: HardhatEthersSigner, name: string) =>
    await contract
      .connect(account)
      .createPlan(
        name,
        "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
        ethers.parseEther("19.99"),
        1,
        {
          gasPrice: ethers.parseUnits("15", "gwei"),
        }
      )
      .then((tx) => tx.wait())
      .then((tx) => {
        console.log(tx?.gasUsed);
        return tx;
      });

  before(async function () {
    contract = await deploySubscriptionService();
  });

  it("Every account should have 1000 tokens", async function () {
    const [account, account2] = await ethers.getSigners();

    await Promise.all(
      Array(5)
        .fill(0)
        .map((_, i) => addPlan(account, `Plan ${i}`))
    );
    await contract
      .connect(account)
      .removePlan(2)
      .then((tx) => tx.wait())
      .then((tx) => {
        console.log("remove", tx?.gasUsed);
        return tx;
      });

    await Promise.all(
      Array(5)
        .fill(0)
        .map((_, i) => addPlan(account2, `Plan2 ${i}`))
    );

    const plan = await contract.getPlanById(1);
    expect(plan.name).to.equal("Plan 1");

    const plans = (await contract.getPlans()).reduce((acc, plan) => {
      const merchant = plan.merchant;
      if (!acc[merchant]) {
        acc[merchant] = [];
      }
      acc[merchant].push({
        id: plan.id,
        name: plan.name,
        price: plan.price.toString(),
        period: plan.period.toString(),
        token: plan.token,
      });
      return acc;
    }, {} as Record<string, any>);
    console.log('plans:', plans)
  });
});
