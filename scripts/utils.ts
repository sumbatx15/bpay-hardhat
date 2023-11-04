import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import { BPayMoney } from "../typechain-types";

export const getAbi = (contractName: string) => {
  try {
    const dir = path.resolve(
      __dirname,
      `../artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    const file = fs.readFileSync(dir, "utf8");
    return JSON.parse(file).abi;
  } catch (e) {
    return "";
  }
};
export function writeJSONAbi(
  frontAbiFolderPath: string,
  contractName: string,
  subscriptionServiceAbi: any
) {
  fs.writeFileSync(
    path.join(frontAbiFolderPath, `${contractName}.json`),
    JSON.stringify(subscriptionServiceAbi)
  );
}
export function writeTSAbi(
  frontAbiFolderPath: string,
  contractName: string,
  subscriptionServiceAbi: any
) {
  fs.writeFileSync(
    path.join(frontAbiFolderPath, `${contractName}.ts`),
    `export const ${contractName}Abi = ${JSON.stringify(
      subscriptionServiceAbi
    )} as const`
  );
}

export const generateAddressesContent = (contract: string, address: string) => {
  return `
export const BPAY_CONTRACT = "${contract}";
export const BPAY_MONEY_CONTRACT_ADDRESS = "${address}";
`;
};

export function approve(
  token: BPayMoney,
  account: HardhatEthersSigner,
  spenderAddr: string
) {
  return token
    .connect(account)
    .approve(spenderAddr, ethers.parseEther("1000000"))
    .then((tx) => tx.wait());
}
export function mint(token: BPayMoney, user: HardhatEthersSigner) {
  return token
    .connect(user)
    .mint(user.address)
    .then((tx) => tx.wait());
}
