import { ethers } from "hardhat";
import fs from "fs";
import { getAbi } from "./utils";

const SUB_CONTRACT_NAME = "SubscriptionService";
const BPAY_CONTRACT_NAME = "BPayMoney";

async function main() {
  const [owner] = await ethers.getSigners();

  const subscriptionService = await ethers
    .deployContract(SUB_CONTRACT_NAME, [owner.address])
    .then((contract) => contract.waitForDeployment());

  const bpayToken = await ethers
    .deployContract(BPAY_CONTRACT_NAME, [])
    .then((contract) => contract.waitForDeployment());

  const subscriptionServiceAbi = getAbi(SUB_CONTRACT_NAME);
  const bpayAbi = getAbi(BPAY_CONTRACT_NAME);

  // C:/Users/Sumba/OneDrive/Desktop/BPay/bpay/src/abi

  fs.writeFileSync(
    `C:/Users/Sumba/OneDrive/Desktop/BPay/bpay/src/abi/${SUB_CONTRACT_NAME}.json`,
    JSON.stringify(subscriptionServiceAbi)
  );

  fs.writeFileSync(
    `C:/Users/Sumba/OneDrive/Desktop/BPay/bpay/src/abi/${BPAY_CONTRACT_NAME}.json`,
    JSON.stringify(bpayAbi)
  );

  const fileContent = `
  export const SUBSCRIPTION_CONTRACT_ADDRESS = "${await subscriptionService.getAddress()}";
  export const BPAY_MONEY_CONTRACT_ADDRESS = "${await bpayToken.getAddress()}";
`;

  fs.writeFileSync(
    "C:/Users/Sumba/OneDrive/Desktop/BPay/bpay/src/contract.ts",
    fileContent
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
