import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import { HARDHATEVM_CHAINID, NETWORKS, TEST_ACCOUNTS } from "./helpers";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_SELF = process.env.PRIVATE_KEY_SELF;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/${process.env.OPTIMISM_MAINNET_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`], // Replace with your private key
      gas: "auto",
      gasPrice: "auto"
    },
    optestnet: {
      url: `https://opt-goerli.g.alchemy.com/v2/${process.env.OPTIMISM_TESTNET_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY_SELF}`], // Replace with your private key
      gas: "auto",
      gasPrice: "auto"
    },
    basetestnet: {
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.BASE_TESTNET_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`], // Replace with your private key
      gas: "auto",
      gasPrice: "auto"
    },
    basemainnet: {
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.BASE_MAINNET_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`], // Replace with your private key
      gas: "auto",
      gasPrice: "auto"
    },
    hardhat: {
      chainId: HARDHATEVM_CHAINID,
      accounts: TEST_ACCOUNTS.map(
        ({ secretKey, balance }: { secretKey: string; balance: string }) => ({
          privateKey: secretKey,
          balance,
        })
      ),
      gas: "auto",
      gasPrice: "auto",
    },
  },
};

export default config;
