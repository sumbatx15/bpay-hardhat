const { exec } = require("child_process");
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { generateAddressesContent, getAbi } from "./utils";
import { writeJSONAbi, mint, writeTSAbi, approve } from "./utils";

const CONTRACT_NAME = "BPayRecurringPayments";
const TOKEN_NAME = "BPayMoney";
const frontRootPath = path.join(__dirname, "../../bpay-front");
const frontSrcPath = path.join(frontRootPath, "/src");
const frontAbiFolderPath = path.join(frontSrcPath, "/abi");
const executorFolder = path.join(
  __dirname,
  "../../bpay-executor/src/contracts"
);

async function main() {
  const [owner, ...users] = await ethers.getSigners();

  const contract = await ethers
    .deployContract(CONTRACT_NAME, [owner.address])
    .then((contract) => contract.waitForDeployment());
    
  const contractABI = getAbi(CONTRACT_NAME);
  const contractAddr = await contract.getAddress();

  const token = await ethers
    .deployContract(TOKEN_NAME, [])
    .then((contract) => contract.waitForDeployment());

  const tokenAddr = await token.getAddress();
  const tokenABI = getAbi(TOKEN_NAME);

  await contract
    .connect(owner)
    .createPlan(
      "CSGO Premium",
      [tokenAddr],
      ethers.parseEther("19.99"),
      1,
      0,
      1,
      60
    );

  writeTSAbi(frontAbiFolderPath, CONTRACT_NAME, contractABI);
  writeJSONAbi(frontAbiFolderPath, CONTRACT_NAME, contractABI);
  writeTSAbi(frontAbiFolderPath, TOKEN_NAME, tokenABI);
  writeJSONAbi(frontAbiFolderPath, TOKEN_NAME, tokenABI);

  writeTSAbi(executorFolder, CONTRACT_NAME, contractABI);
  writeJSONAbi(executorFolder, CONTRACT_NAME, contractABI);
  writeTSAbi(executorFolder, TOKEN_NAME, tokenABI);
  writeJSONAbi(executorFolder, TOKEN_NAME, tokenABI);

  await Promise.all(
    [owner, ...users].map(async (user) => {
      await mint(token, user);
      await approve(token, user, contractAddr);
    })
  );

  const fileContent = generateAddressesContent(contractAddr, tokenAddr);
  fs.writeFileSync(path.join(frontSrcPath, "/contract.ts"), fileContent);
  fs.writeFileSync(path.join(executorFolder, "/index.ts"), fileContent);

  exec("yarn generate", { cwd: frontRootPath });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
