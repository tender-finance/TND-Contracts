require("@nomiclabs/hardhat-waffle")
import('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-ethers")
require("hardhat-contract-sizer")
require('@typechain/hardhat')
require('@nomicfoundation/hardhat-foundry')

const {
  ARBITRUM_RPC,
  ARBISCAN_KEY,
  PRIVATE_KEY,
} = require("./env.json")

module.exports = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: ARBITRUM_RPC,
        enabled: true,
      },
    },
    arbitrum: {
      url: ARBITRUM_RPC,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: ARBISCAN_KEY,
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.2",
      },
      {
        version: "0.8.12",
      },
      {
        version: "0.8.11",
      },
      {
        version: "0.8.10",
      },
      {
        version: "0.6.12",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 20
      }
    }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
}
