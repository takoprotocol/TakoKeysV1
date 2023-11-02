import { use } from "chai";
import { BaseContract, Signer, Wallet } from "ethers";
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import {
  FAKE_PRIVATEKEY,
  revertToSnapshot,
  takeSnapshot,
} from "./shared/utils";
import { TakoKeysV1, FarcasterKey } from "../typechain-types";
import {
  FarcasterHubAbi,
  FarcasterKeyAbi
} from "./shared/abis";
import { FakeContract, smock } from "@defi-wonderland/smock";

use(solidity);

export let testWallet: Wallet;
export let accounts: Signer[];
export let deployer: Signer;
export let user: Signer;
export let user1: Signer;
export const users: Signer[] = [];
export let relayer: Signer;

export let farcasterHubMock: FakeContract<BaseContract>;

export let farcasterKey: FarcasterKey;
export let takoKeysV1: TakoKeysV1;

export function makeSuiteCleanRoom(name: string, tests: () => void) {
  describe(name, () => {
    beforeEach(async function () {
      await takeSnapshot();
    });
    tests();
    afterEach(async function () {
      await revertToSnapshot();
    });
  });
}

before(async () => {
  await initAccount();
  await initContract();
});

async function initAccount() {
  testWallet = new ethers.Wallet(FAKE_PRIVATEKEY).connect(ethers.provider);
  accounts = await hre.ethers.getSigners();
  deployer = accounts[0];
  relayer = accounts[1];
  user = accounts[2];
  user1 = accounts[3];
  for (let i = 0; i < 6; i++) {
    users.push(accounts[4 + i]);
  }
}

async function initContract() {
  await initFarcasterMock();
  //await initJamOldContractMock();
  const takoV1Factory = await hre.ethers.getContractFactory(
    "TakoKeysV1"
  );
  takoKeysV1 = (await takoV1Factory
    .connect(deployer)
    .deploy(farcasterHubMock.address)) as TakoKeysV1;
  farcasterKey = new ethers.Contract(
    await takoKeysV1.farcasterKey(),
    FarcasterKeyAbi,
    deployer
  ) as FarcasterKey;
}

async function initFarcasterMock(){
  const creatorOwner = await users[0].getAddress();
  const creatorOwner1 = await users[1].getAddress();
  farcasterHubMock = await smock.fake(FarcasterHubAbi);
  farcasterHubMock.recoveryOf.whenCalledWith(1).returns(creatorOwner);
  farcasterHubMock.recoveryOf.whenCalledWith(2).returns(creatorOwner1);
}
