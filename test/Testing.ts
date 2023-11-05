import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect, util } from "chai";
import { AddressLike, ContractTransactionReceipt } from "ethers";
import { ethers } from "hardhat";
import {
  deployBpayMoneyContract,
  deployBPayRecurringPaymentsContract,
  logGasUsed,
  wait,
  weiToUsd,
} from "./utils";

describe("Testing", function () {
  let contract: Awaited<ReturnType<typeof deployBPayRecurringPaymentsContract>>;
  let contractAddr: AddressLike;
  let token: Awaited<ReturnType<typeof deployBpayMoneyContract>>;
  let tokenAddr: AddressLike;
  let subscribers: HardhatEthersSigner[] = [];

  before(async function () {
    contract = await deployBPayRecurringPaymentsContract();
    contractAddr = contract.getAddress();
    token = await deployBpayMoneyContract();
    tokenAddr = token.getAddress();
    subscribers = (await ethers.getSigners()).slice(1);

    (await ethers.getSigners()).map(async (signer) => {
      await token.connect(signer).mint(signer.address);
      await token
        .connect(signer)
        .approve(contractAddr, ethers.parseEther("100000"));
    });
  });

  it("Deposit funds", async function () {
    const account = (await ethers.getSigners())[0];
    await contract
      .connect(account)
      .depositServiceFee({
        value: ethers.parseEther("1"),
      })
      .then(logGasUsed("depositServiceFee"));

    expect(await contract.getServiceFeeBalance(account.address)).to.be.equal(
      ethers.parseEther("1")
    );
  });

  it("Accounts should have 1000+ tokens", async function () {
    (await ethers.getSigners()).map(async (signer) => {
      expect(await token.balanceOf(signer.address)).to.greaterThanOrEqual(
        ethers.parseEther("1000")
      );
    });
  });

  it("Create plan", async function () {
    const account = (await ethers.getSigners())[0];

    await contract
      .createPlan("Plan 1", [tokenAddr], 100, 1, 0, 2, 1)
      .then(logGasUsed("createPlan"));

    const _plan = await contract.getPlanById(0);
    expect(_plan.merchant).to.be.equal(account.address);
  });

  it("Subscribe to plan", async function () {
    Promise.all(
      subscribers.map(async (account, i) => {
        const res = await contract.connect(account).subscribe(0, tokenAddr);

        const subscribers = await contract.getSubscriptions();
        expect(subscribers.length).to.be.equal(i + 1);
        expect(subscribers[i].customer).to.be.equal(account.address);
        expect(res).to.emit(contract, "Subscribed");
      })
    );
  });

  it("creates plans from second user", async function () {
    const owner = (await ethers.getSigners())[0];
    const account = (await ethers.getSigners())[1];
    await contract
      .connect(account)
      .createPlan("Plan 1", [tokenAddr], ethers.parseEther("12"), 30, 0, 0, 0)
      .then(logGasUsed("createPlan"));

    await contract.connect(account).depositServiceFee({
      value: ethers.parseEther("1"),
    });

    await contract.connect(account).subscribe(1, tokenAddr);

    const plans = await contract.getMerchantPlans(account.address);
    console.log("plans:", plans);
    const subs = await contract.getPlanSubscriptions(plans[0].id);
    console.log("subs:", subs);

    await expect(
      contract.connect(owner).execute(account.address, [1], [[19]])
    ).to.emit(contract, "PaymentTransferred");

    expect(subs[0].updatedAt.toString()).to.not.be.equal("0");
  });

  // it("Should collect payments", async function () {
  //   const [account, account2, executor] = await ethers.getSigners();
  //   const account2TokenBalanceBefore = await token.balanceOf(account2.address);
  //   const planPrice = (await contract.getPlanById(0)).price;
  //   const account2TokenBalanceAfter = account2TokenBalanceBefore - planPrice;
  //   const executorETHBalanceBefore = await ethers.provider.getBalance(
  //     executor.address
  //   );

  //   const res = await contract
  //     .connect(executor)
  //     .execute(account.address, [0], [subscribers.map((s, i) => i)])
  //     .then(logGasUsed("execute"))!;

  //   expect(await token.balanceOf(account2.address)).to.be.equal(
  //     account2TokenBalanceAfter
  //   );
  //   expect(await contract.getServiceFeeBalance(account.address)).to.be.lessThan(
  //     ethers.parseEther("1")
  //   );

  //   const executorBalanceAfter = await ethers.provider.getBalance(
  //     executor.address
  //   );
  //   console.log(
  //     "      reward:",
  //     weiToUsd(executorBalanceAfter - executorETHBalanceBefore)
  //   );
  //   expect(executorBalanceAfter).to.be.greaterThan(executorETHBalanceBefore);
  // });

  // it("Should be striked", async function () {
  //   const [executor, ...rest] = await ethers.getSigners();

  //   const [sub] = await contract.getSubscriptions();
  //   const firstSubscriber = rest.find((s) => s.address === sub.customer);
  //   if (!firstSubscriber) throw new Error("No subscriber found");

  //   await token
  //     .connect(firstSubscriber)
  //     .approve(contractAddr, ethers.parseEther("0"))
  //     .then(logGasUsed("approve"))!;

  //   // check allowance
  //   const allowance = await token.allowance(
  //     firstSubscriber.address,
  //     contractAddr
  //   );

  //   expect(allowance).to.be.equal(0);

  //   await wait(2000);

  //   await contract
  //     .connect(executor)
  //     .execute(executor.address, [0], [[sub.id]])
  //     .then(logGasUsed("execute"))!;

  //   expect(await contract.strikes(0)).to.be.equal(1);

  //   await contract
  //     .connect(executor)
  //     .execute(executor.address, [0], [[sub.id]])
  //     .then(logGasUsed("execute"))!;

  //   expect(await contract.strikes(0)).to.be.equal(2);

  //   const res = await contract
  //     .connect(executor)
  //     .execute(executor.address, [0], [[sub.id]])
  //     .then(logGasUsed("execute"))!;

  //   expect(res).to.emit(contract, "SubscriptionRemoved");
  // });
});
