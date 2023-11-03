import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  BigNumberish,
  ContractTransactionReceipt,
  ContractTransactionResponse,
} from "ethers";
import { ethers } from "hardhat";

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const weiToUsd = (wei: BigNumberish) => {
  return usd.format(+ethers.formatEther(wei) * ETH_PRICE);
};

export const ETH_PRICE = 1787.76;
export const logGasUsed =
  (name: string) => async (tx: ContractTransactionResponse) => {
    const res = (await tx.wait())!;
    console.log(
      `\n\n      ${ethers.formatUnits(res.gasPrice, "gwei")}gwei`,
      name,
      res.gasUsed,
      `${weiToUsd(res.gasUsed * res.gasPrice)} `
    );
    return res;
  };

export const deployTestingContract = async function () {
  const [owner] = await ethers.getSigners();
  return await ethers.getContractFactory("Testing").then(async (factory) => {
    return await factory.deploy(owner.address);
  });
};

export const deployBpayMoneyContract = async function () {
  const [owner] = await ethers.getSigners();
  return await ethers.getContractFactory("BPayMoney").then(async (factory) => {
    return await factory.deploy();
  });
};

export const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
