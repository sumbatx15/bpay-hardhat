import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
      gasPrice: 11000000000,
    },
  },
};

export default config;
