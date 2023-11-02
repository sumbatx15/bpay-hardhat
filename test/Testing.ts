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

  const addPlan = async (account: HardhatEthersSigner) =>
    await contract
      .connect(account)
      .createPlan("Dani", ethers.parseEther("19.99"), 1, {
        gasPrice: ethers.parseUnits("15", "gwei"),
      })
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
        .map(() => addPlan(account))
    );
    await Promise.all(
      Array(5)
        .fill(0)
        .map(() => addPlan(account2))
    );
  });
});
