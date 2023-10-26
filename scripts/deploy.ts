import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getAbi } from "./utils";
const { exec } = require("child_process");

const SUB_CONTRACT_NAME = "SubscriptionService";
const BPAY_CONTRACT_NAME = "BPayMoney";

async function main() {
  const [owner, ...users] = await ethers.getSigners();

  const subscriptionService = await ethers
    .deployContract(SUB_CONTRACT_NAME, [owner.address])
    .then((contract) => contract.waitForDeployment());

  const bpayToken = await ethers
    .deployContract(BPAY_CONTRACT_NAME, [])
    .then((contract) => contract.waitForDeployment());

  const subscriptionServiceAbi = getAbi(SUB_CONTRACT_NAME);
  const bpayAbi = getAbi(BPAY_CONTRACT_NAME);

  const frontRootPath = path.join(__dirname, "../../bpay-front");
  const frontSrcPath = path.join(frontRootPath, "/src");
  const frontAbiFolderPath = path.join(frontSrcPath, "/abi");

  fs.writeFileSync(
    path.join(frontAbiFolderPath, `${SUB_CONTRACT_NAME}.ts`),
    `export const ${SUB_CONTRACT_NAME}Abi = ${JSON.stringify(
      subscriptionServiceAbi
    )} as const`
  );

  fs.writeFileSync(
    path.join(frontAbiFolderPath, `${BPAY_CONTRACT_NAME}.ts`),
    `export const ${BPAY_CONTRACT_NAME}Abi = ${JSON.stringify(bpayAbi)} as const`
  );

  const subAddress = await subscriptionService.getAddress();
  const tokenAddress = await bpayToken.getAddress();

  await Promise.all(
    users.map((user) => {
      return bpayToken
        .connect(owner)
        .mint(user.address)
        .then((tx) => tx.wait());
    })
  );

  const fileContent = `
  export const SUBSCRIPTION_CONTRACT_ADDRESS = "${subAddress}";
  export const BPAY_MONEY_CONTRACT_ADDRESS = "${tokenAddress}";
`;

  fs.writeFileSync(path.join(frontSrcPath, "/contract.ts"), fileContent);
  // @ts-ignore
  exec("yarn generate", { cwd: frontRootPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
