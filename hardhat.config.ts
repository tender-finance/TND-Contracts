import { HardhatUserConfig } from "hardhat/config";
import "tsconfig-paths/register";
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-contract-sizer"
import '@typechain/hardhat'
// import '@nomicfoundation/hardhat-foundry'
// import "@foundry-rs/hardhat-anvil";
import {
  ARBITRUM_RPC,
  ARBISCAN_KEY,
  PRIVATE_KEY,
} from "./env.json";
import {subtask} from "hardhat/config";
import {TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS} from 'hardhat/builtin-tasks/task-names'

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();
    return paths.filter((p: string) => !p.endsWith('.t.sol'));
  }
)

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    anvil: {
      url: "http://127.0.0.1:8545",
      chainId: 42161,
      allowUnlimitedContractSize: true,
      accounts: [PRIVATE_KEY],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: ARBITRUM_RPC,
        enabled: true,
        blockNumber: 78444023,
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
        version: "0.8.9",
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
        runs: 200
      }
    }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
}

export default config;
