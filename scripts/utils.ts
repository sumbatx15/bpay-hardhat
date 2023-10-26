const fs = require("fs");
const path = require("path");

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
