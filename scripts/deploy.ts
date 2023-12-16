import { ethers } from 'hardhat';
import { BigNumber } from 'bignumber.js';

const farcasterAddress = "0x00000000fc6c5f01fc30151999387bb99a9f489b";

const deployContract = async () => {
  // Get signers
  const signers = await ethers.getSigners();
  console.log(signers[0].address);

  // Deploy contract
  const contractFactory = await ethers.getContractFactory('ProfileMarketV1');
  const contract = await contractFactory.deploy(farcasterAddress);

  // Log contract address
  console.log('Contract deployed to:', contract.address);

  contract.connect(signers[0]);

  let methodName = 'setOpenInit'; // Replace with actual method name
  const args = [true]; // Replace with actual arguments
  const options = { gasLimit: 1000000 }; // Optional gas limit
  const FEE_PERCENT = new BigNumber(0.001).shiftedBy(18);

  let result = await contract[methodName](...args, options);
  console.log('setOpenInit done', result);

  const feeArgs = [FEE_PERCENT.toFixed()];
  
  methodName = 'setProtocolBuyFeePercent';
  result = await contract[methodName](...feeArgs, options);
  console.log('setProtocolBuyFeePercent done', result);

  methodName = 'setProtocolSellFeePercent';
  result = await contract[methodName](...feeArgs, options);
  console.log('setProtocolSellFeePercent done', result);

  methodName = 'setCreatorBuyFeePercent';
  result = await contract[methodName](...feeArgs, options);
  console.log('setCreatorBuyFeePercent done', result);

  methodName = 'setCreatorSellFeePercent';
  result = await contract[methodName](...feeArgs, options);
  console.log('setCreatorSellFeePercent done', result);

  const propertyValue = await contract.farcasterKey();
  console.log("Value of myPublicProperty:", propertyValue.toString());
};

deployContract();

  