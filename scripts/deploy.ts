import { ethers } from 'hardhat';
import { BigNumber } from 'bignumber.js';

const addressOfProxy = "0x197309df1f580884B5A2A75DFd842a524Fd8AC15";

const deployContract = async () => {
  // Get signers
  const signers = await ethers.getSigners();
  console.log(signers[0].address);

  // Deploy contract
  const contractFactory = await ethers.getContractFactory('ProfileMarketV1');
  const contract = await contractFactory.deploy(addressOfProxy);

  // Log contract address
  console.log('Contract deployed to:', contract.address);

  // contract.connect(signers[0]);

  // let methodName = 'setOpenInit'; // Replace with actual method name
  // const args = [true]; // Replace with actual arguments
  // const options = { gasLimit: 1000000 }; // Optional gas limit
  // const FEE_PERCENT = new BigNumber(0.05).shiftedBy(18);

  // let result = await contract[methodName](...args, options);
  // console.log('setOpenInit done', result);

  // const feeArgs = [FEE_PERCENT.toFixed()];
  
  // methodName = 'setProtocolBuyFeePercent';
  // result = await contract[methodName](...feeArgs, options);
  // console.log('setProtocolBuyFeePercent done', result);

  // methodName = 'setProtocolSellFeePercent';
  // result = await contract[methodName](...feeArgs, options);
  // console.log('setProtocolSellFeePercent done', result);

  // methodName = 'setCreatorBuyFeePercent';
  // result = await contract[methodName](...feeArgs, options);
  // console.log('setCreatorBuyFeePercent done', result);

  // methodName = 'setCreatorSellFeePercent';
  // result = await contract[methodName](...feeArgs, options);
  // console.log('setCreatorSellFeePercent done', result);

  const propertyValue = await contract.farcasterKey();
  console.log("Value of myPublicProperty:", propertyValue.toString());
};

deployContract();

  