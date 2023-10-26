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

  await subscriptionService
    .connect(owner)
    .addPlan("plan1", ethers.parseEther("100"), 30)
    .then((tx) => tx.wait());

  const frontRootPath = path.join(__dirname, "../../bpay-front");
  const frontSrcPath = path.join(frontRootPath, "/src");
  const frontAbiFolderPath = path.join(frontSrcPath, "/abi");

  writeTSAbi(frontAbiFolderPath, SUB_CONTRACT_NAME, subscriptionServiceAbi);
  writeJSONAbi(frontAbiFolderPath, SUB_CONTRACT_NAME, subscriptionServiceAbi);

  writeTSAbi(frontAbiFolderPath, BPAY_CONTRACT_NAME, bpayAbi);
  writeJSONAbi(frontAbiFolderPath, BPAY_CONTRACT_NAME, bpayAbi);

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

function writeJSONAbi(
  frontAbiFolderPath: string,
  contractName: string,
  subscriptionServiceAbi: any
) {
  fs.writeFileSync(
    path.join(frontAbiFolderPath, `${contractName}.json`),
    JSON.stringify(subscriptionServiceAbi)
  );
}

function writeTSAbi(
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
