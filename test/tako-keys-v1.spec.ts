import { expect } from 'chai';
import {
  deployer,
  profileMarketV1,
  makeSuiteCleanRoom,
  testWallet,
  user,
  users,
  user1,
} from './__setup.spec';
import { ERRORS } from './helpers/errors';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'hardhat';

let creatorOwner = users[0];
let creatorOwner1 = users[1];
let relayer = testWallet;
const CREATOR_ID = 1;
const CREATOR_ID_A = 2;
const CREATOR_NOT_EXIST = 10;
const FEE_PERCENT = new BigNumber(0.05).shiftedBy(18);
makeSuiteCleanRoom('ProfileMarketV1', () => {
  context('Gov', () => {
    beforeEach(async () => {
      await init();
    });
    it('Should fail to set fee destination if sender does not own the contract', async () => {
      await expect(
        profileMarketV1
          .connect(user)
          .setFeeDestination(await deployer.getAddress())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should fail to set protocol fee percent if sender does not own the contract', async () => {
      await expect(
        profileMarketV1
          .connect(user)
          .setProtocolBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
      await expect(
        profileMarketV1
          .connect(user)
          .setProtocolSellFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should fail to set creator fee percent if sender does not own the contract', async () => {
      await expect(
        profileMarketV1
          .connect(user)
          .setCreatorBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
      await expect(
        profileMarketV1
          .connect(user)
          .setCreatorSellFeePercent(FEE_PERCENT.toFixed())
      ).to.revertedWith(ERRORS.NOT_OWNER);
    });
    it('Should success to set fee destination', async () => {
      await expect(
        profileMarketV1
          .connect(deployer)
          .setFeeDestination(await deployer.getAddress())
      ).to.not.reverted;
    });
    it('Should success to set protocol fee percent', async () => {
      await expect(
        profileMarketV1
          .connect(deployer)
          .setProtocolSellFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
      await expect(
        profileMarketV1
          .connect(deployer)
          .setProtocolBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
    });
    it('Should success to set creator fee percent', async () => {
      await expect(
        profileMarketV1
          .connect(deployer)
          .setCreatorBuyFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
      await expect(
        profileMarketV1
          .connect(deployer)
          .setCreatorSellFeePercent(FEE_PERCENT.toFixed())
      ).to.not.reverted;
    });
  })

  context('User Create', () => {
    beforeEach(async () => {
      await init();
    });
    it('Should success to create pool', async () => {
      await expect(profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10 * 10**8, 0, true, 10000 * 10**8, true)).to.not.reverted;
    })
    it('Should success to create pool and buy', async () => {
      await expect(profileMarketV1.connect(creatorOwner1).createSharesWithInitialBuy(CREATOR_ID_A, 10000, 5, 50, 10 * 10**8, 0, true, 10000 * 10**8, true, 3, {value: 33000})).to.not.reverted;
    })
    it('Should fail due to pool has been created', async () => {
      await profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10 * 10**8, 0, true, 10000 * 10**8, true,);
      await expect(profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID, 10000, 5, 50, 10 * 10**8,  0, true, 10000 * 10**8, true)).to.revertedWith(ERRORS.POOL_CREATED);
    })
    it('Should fail due to CREATOR ID not exist', async () => {
      await expect(profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_NOT_EXIST, 10000, 5, 50 , 10* 10**8, 0, true, 10000 * 10**8, true)).to.revertedWith(ERRORS.CREATOR_CAN_NOT_BE_ZERO);
    })
    it('Should success to create pool with negative signs', async () => {
      await expect(profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID, 10000, 5, 50, 500 * 10**8, 0, true, 500 * 10**8, false)).to.not.reverted;
      await expect(profileMarketV1.connect(creatorOwner).buyShares(CREATOR_ID, 6, {value: 74250})).to.not.reverted;
    })
    it('test for decimal', async () =>{
      await profileMarketV1.connect(creatorOwner).createSharesWithInitialBuy(CREATOR_ID, 0 ,3, 400, 625035158227651, 0 , true, 5625316420160000,false,4 ,{value: 48127707 })
      //await takoKeysV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID, 0, 3, 400, 625035158227651, 0 , true, 5625316420160000, false);
      //console.log(await takoKeysV1.connect(creatorOwner).getBuyPrice(CREATOR_ID, 4));
    })
  })

  context('User buy', () => {
    before(async () => {
      await init();
      await initCreate();
    })
      it('Should success to buy Shares', async () => {
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 2, {value: 22000})).to.not.reverted;
      })
      it('Should fail to buy with insufficient token', async () => {
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 2, {value: 21999})).to.revertedWith(ERRORS.INSUFFICIENT_PAYMENT)
      })
      it('Should success to buy for constant and curve price both', async () => {
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 10, {value: 113630})).to.not.reverted;
      })
      it('Should fail to buy with insufficient token', async () => {
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 10, {value: 113629})).to.revertedWith(ERRORS.INSUFFICIENT_PAYMENT)
      })
      it('Should success to buy for curve price', async () => {
        await profileMarketV1.connect(user).buyShares(CREATOR_ID, 5, {value: 55000});
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 10, {value: 123035})).to.not.reverted;
      })
      it('Should success to buy for both', async () => {
        await profileMarketV1.connect(user).buyShares(CREATOR_ID, 1, {value: 11000});
        await expect(profileMarketV1.connect(user).buyShares(CREATOR_ID, 9, {value: 102630})).to.not.reverted;
      })
  })

  context('User sell', () => {
    before(async () =>{
      await init();
      await initBuy();
    });
      it('Should success to sell Share on curve only',async () => {
        await expect(profileMarketV1.connect(user).sellShares([0],9900)).to.not.reverted
      })
      it('Should success to sell Share on both constant and curve',async () => {
        await expect(profileMarketV1.connect(user).sellShares([...Array(10).keys()],92970)).to.not.reverted
      })
      it('Should fail to sell Share on both constant and curve due to price range',async () => {
        await expect(profileMarketV1.connect(user).sellShares([...Array(10).keys()],92971)).to.revertedWith(ERRORS.PRICE_NOT_IN_RANGE);
      })
      it('Should success to sell Share on constant only',async () => {
        await profileMarketV1.connect(user).sellShares([...Array(9).keys()], 83970);
        await expect(profileMarketV1.connect(user).sellShares([9],9000)).to.not.reverted
      })
      it('Should fail to sell Share of others token', async () => {
        await expect(profileMarketV1.connect(user1).sellShares([0], 0)).to.reverted 
      })
      it('Should fail to sell Share if empty', async () => {
        await expect(profileMarketV1.connect(user).sellShares([], 0)).to.reverted
      }
      )
    })
  });

  context('User claim', () => {
    before(async () => {
      await init();
    });
    it('Should fail to claim if claimable is zero', async () => {
      await expect(profileMarketV1.connect(user).claim()).to.revertedWith(
        ERRORS.ZERO_CLAIMABLE
      );
    });
    // 113630 / 11 / 2 = 5165
    it('claim amount check', async () => {
      expect(await profileMarketV1.connect(creatorOwner).userClaimable(creatorOwner.getAddress())).to.equal(5165);
    })
    it('claim amount check should be zero', async () => {
      expect(await profileMarketV1.connect(creatorOwner1).userClaimable(creatorOwner1.getAddress())).to.equal(0);
    })
    it('Should success to claim', async () => {
      expect(
        await profileMarketV1
          .connect(creatorOwner)
          .claim()
      ).to.not.reverted;
    });
  });

  context('Quire check', async () => {
    before(async () => {
      await init();
    });
    it("get buy price check", async () => {
      expect(await profileMarketV1.connect(creatorOwner).getBuyPrice(CREATOR_ID, 1)).to.equal(11210);
    });
    it("get sell price check", async () => {
      expect(await profileMarketV1.connect(creatorOwner).getSellPrice(CREATOR_ID, 1)).to.equal(11000);
    })
  })

async function init() {
  relayer = testWallet;
  creatorOwner = users[0];
  creatorOwner1 = users[1];
  await profileMarketV1.connect(deployer).setOpenInit(true);
  await profileMarketV1
    .connect(deployer)
    .setProtocolBuyFeePercent(FEE_PERCENT.toFixed());
  await profileMarketV1
    .connect(deployer)
    .setProtocolSellFeePercent(FEE_PERCENT.toFixed());
  await profileMarketV1
    .connect(deployer)
    .setCreatorBuyFeePercent(FEE_PERCENT.toFixed());
  await profileMarketV1
    .connect(deployer)
    .setCreatorSellFeePercent(FEE_PERCENT.toFixed());
  await profileMarketV1
    .connect(deployer)
    .setFeeDestination(deployer.getAddress());
}

async function initCreate() {
  await expect(profileMarketV1.connect(creatorOwner).createSharesForPiecewise(CREATOR_ID,10000,5, 50, 10 * 10**8, 0, true, 10000 * 10**8, true)).to.not.reverted;
}

async function initBuy() {
  await profileMarketV1.connect(user).buyShares(CREATOR_ID, 10, {value: 113630});
}