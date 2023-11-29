import { expect } from 'chai';
import {
  deployer,
  takoKeysV1,
  farcasterHubMock,
  makeSuiteCleanRoom,
  testWallet,
  user,
  users,
  user1,
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
  context('User Create', () => {
    beforeEach(async () => {
      await init();
    });
    it('Should success to create pool', async () => {
      await expect(takoKeysV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10, 0, 10000)).to.not.reverted;
    })
    it('Should fail due to pool has been created', async () => {
      await takoKeysV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10, 0, 10000);
      await expect(takoKeysV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID, 10000, 5, 50, 10, 0, 10000)).to.revertedWith(ERRORS.POOL_CREATED);
    })
  });
  context('User buy', () => {
    before(async () => {
      await init();
      await initCreate();
    })
      it('Should success to buy Shares', async () => {
        await expect(takoKeysV1.connect(user).buyShares(CREATOR_ID, 4, {value: 420000})).to.not.reverted
      })
      it('Should fail to buy with insufficient token', async () => {
        await expect(takoKeysV1.connect(user).buyShares(CREATOR_ID, 1, {value: 1})).to.revertedWith(ERRORS.INSUFFICIENT_PAYMENT)
      })
      it('Should success to buy for constant and curve price both', async () => {
        await expect(takoKeysV1.connect(user).buyShares(CREATOR_ID, 10, {value: 10053000})).to.not.reverted
      })
      it('Should success to buy for curve price', async () => {
        await takoKeysV1.connect(user).buyShares(CREATOR_ID, 5, {value: 525000});
        await expect(takoKeysV1.connect(user).buyShares(CREATOR_ID, 10, {value: 10053000})).to.not.reverted
      })
  })
  context('User sell', () => {
    before(async () =>{
      await init();
      await initBuy();
    });
      it('Should success to sell Share on curve only',async () => {
        await expect(takoKeysV1.connect(user).sellShares([0],0)).to.not.reverted
      })
      it('Should success to sell Share on both constant and curve',async () => {
        await expect(takoKeysV1.connect(user).sellShares([...Array(8).keys()].slice(1),0)).to.not.reverted
      })
      it('Should success to sell Share on constant only',async () => {
        await takoKeysV1.connect(user).sellShares([...Array(8).keys()].slice(1),0);
        console.log("----------------------------");
        await expect(takoKeysV1.connect(user).sellShares([0],0)).to.not.reverted
      })
      it('Should fail to sell Share of others token', async () => {
        await expect(takoKeysV1.connect(user1).sellShares([0], 0)).to.reverted 
      })
      it('Should fail to sell Share if price not in range', async () => {
        await expect(takoKeysV1.connect(user).sellShares([0], 100000000)).to.reverted
      })
      it('Should fail to sell Share if empty', async () => {
        await expect(takoKeysV1.connect(user).sellShares([], 0)).to.reverted
      }
      )
    })
  });

  context('User claim', () => {
    before(async () => {
      await init();
      await initBuy();
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
  //id, idoPrice, idoAmount, sharesAmount, a, k
  await expect(takoKeysV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10, 0, 10000)).to.not.reverted;
}

async function initBuy() {
  await takoKeysV1.connect(user).buyShares(CREATOR_ID, 10, {value: 10053000});
}