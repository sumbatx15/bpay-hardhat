import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      mining: {
        auto: false,
        interval: 3000,
      },
      chainId: 1337,
      gasPrice: 6000000000,
    },
  },
};

export default config;
