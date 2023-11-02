import { expect } from 'chai';
import {
  deployer,
  takoKeysV1,
  farcasterHubMock,
  makeSuiteCleanRoom,
  testWallet,
  user,
  users,
} from './__setup.spec';
import { ERRORS } from './helpers/errors';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'hardhat';
import { async } from './shared/utils';

let creatorOwner = users[0];
let creatorOwner1 = users[1];
let relayer = testWallet;
const CREATOR_ID = 1;
const CREATOR_NOT_EXIST = 10;
const FEE_PERCENT = new BigNumber(0.05).shiftedBy(18);
makeSuiteCleanRoom('takoKeysV1', () => {
  context('Gov', () => {
    beforeEach(async () => {
      await init();
    });
    it('Should fail to set fee destination if sender does not own the contract', async () => {
      await expect(
        takoKeysV1
          .connect(user)
          .setFeeDestination(await deployer.getAddress())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should fail to set protocol fee percent if sender does not own the contract', async () => {
      await expect(
        takoKeysV1
          .connect(user)
          .setProtocolBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
      await expect(
        takoKeysV1
          .connect(user)
          .setProtocolSellFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should fail to set creator fee percent if sender does not own the contract', async () => {
      await expect(
        takoKeysV1
          .connect(user)
          .setCreatorBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
      await expect(
        takoKeysV1
          .connect(user)
          .setCreatorSellFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should success to set fee destination', async () => {
      await expect(
        takoKeysV1
          .connect(deployer)
          .setFeeDestination(await deployer.getAddress())
      ).to.not.reverted;
    });
    it('Should success to set protocol fee percent', async () => {
      await expect(
        takoKeysV1
          .connect(deployer)
          .setProtocolSellFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
      await expect(
        takoKeysV1
          .connect(deployer)
          .setProtocolBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
    });
    it('Should success to set creator fee percent', async () => {
      await expect(
        takoKeysV1
          .connect(deployer)
          .setCreatorBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
      await expect(
        takoKeysV1
          .connect(deployer)
          .setCreatorSellFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
    });
  });
  context('User AMM Create', () => {
    beforeEach(async () => {
      await init();
    });
    it('Should success to create pool', async () => {
      await expect(takoKeysV1.connect(creatorOwner).createShares(CREATOR_ID,1000,1000)).to.not.reverted;
      //await expect(jamfrensKeysV1.connect(user).getMessageSender()).to.not.reverted;
    })
  });
  context('User buy by AMM', () => {
    beforeEach(async () => {
      await init();
      await initCreate();
    })
      it('Should success to buy by AMM Shares', async () => {
        await expect(takoKeysV1.connect(user).buySharesByAMM(CREATOR_ID, 100, {value: 10000})).to.not.reverted
      })
      it('Should fail to buy if insufficient payment', async () => {
        await expect(takoKeysV1.connect(user).buySharesByAMM(CREATOR_ID, 100, {value: 1})).to.revertedWith(ERRORS.INSUFFICIENT_PAYMENT)
      })
      it('Should fail to buy if creatorId error', async () => {
        await expect(takoKeysV1.connect(user).buySharesByAMM(CREATOR_NOT_EXIST, 100, {value: 10000})).to.revertedWith(ERRORS.CREATOR_CAN_NOT_BE_ZERO)
      })
  })
  context('User sell by AMM', () => {
    beforeEach(async () =>{
      await init();
      await initBuyAMM();
    });
    it('Should success to sell Share by AMM',async () => {
      await expect(takoKeysV1.connect(user).sellShareByAMM([0],0)).to.not.reverted
    })
    it('Should success to sell shares by AMM', async () => {
      await expect(takoKeysV1.connect(user).sellSharesByAMM([...Array(10).keys()].slice(1), 0)).to.not.reverted
    })
  });

  context('User claim', () => {
    beforeEach(async () => {
      await init();
      await initBuyAMM();
    });
    it('Should fail to claim if claimable is zero', async () => {
      await expect(takoKeysV1.connect(user).claim()).to.revertedWith(
        ERRORS.ZERO_CLAIMABLE
      );
    });
    it('Should success to claim', async () => {
      expect(
        await takoKeysV1
          .connect(creatorOwner)
          .claim()
      ).to.not.reverted;
    });
  });
});

async function init() {
  relayer = testWallet;
  creatorOwner = users[0];
  creatorOwner1 = users[1];
  await takoKeysV1.connect(deployer).setOpenInit(true);
  await takoKeysV1
    .connect(deployer)
    .setProtocolBuyFeePercent(FEE_PERCENT.toFixed());
  await takoKeysV1
    .connect(deployer)
    .setProtocolSellFeePercent(FEE_PERCENT.toFixed());
  await takoKeysV1
    .connect(deployer)
    .setCreatorBuyFeePercent(FEE_PERCENT.toFixed());
  await takoKeysV1
    .connect(deployer)
    .setCreatorSellFeePercent(FEE_PERCENT.toFixed());
}

async function initCreate() {
  await takoKeysV1.connect(creatorOwner).createShares(CREATOR_ID, 1000, 1000);
}

async function initBuyAMM() {
  await initCreate();
  await takoKeysV1.connect(user).buySharesByAMM(CREATOR_ID, 100, {value: 10000});
}