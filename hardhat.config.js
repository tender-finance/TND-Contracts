require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-ethers")
require("hardhat-contract-sizer")
require('@typechain/hardhat')
require('@nomicfoundation/hardhat-foundry')
require("@foundry-rs/hardhat-anvil");

const {subtask} = require("hardhat/config");
const {TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS} = require('hardhat/builtin-tasks/task-names')
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();
    return paths.filter(p=> !p.endsWith('.t.sol'));
  }
)

const {
  ARBITRUM_RPC,
  ARBISCAN_KEY,
  PRIVATE_KEY,
} = require("./env.json")

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    anvil: {
      url: "http://127.0.0.1:8545",
      launch: false,
      enabled: true,
      forkUrl: ARBITRUM_RPC,
      forkBlockNumber: 76433959,
      chainId: 42161,
      allowUnlimitedContractSize: true,
      accounts: [PRIVATE_KEY],
    },
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
