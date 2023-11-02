import * as hre from 'hardhat';
import { confirmDeploy, loadBaseUtils } from './common';
import { NETWORKS } from '../helpers';
declare const global: any;

const lensHub: { [key: string]: string } = {
  [NETWORKS.Mainnet]: '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d',
  [NETWORKS.TestNet]: '0x60Ae865ee4C725cd04353b5AAb364553f56ceF82',
};

const deployed: { [key: string]: string } = {
  [NETWORKS.Mainnet]: '0x3dbeA36CEd3cd155605b725faf7E3f66Dc5d6B2b',
  [NETWORKS.TestNet]: '0xCecD3B717EbE5645BcCE6Ec77F9017eDb4436206',
};

async function main() {
  await loadBaseUtils();
  const networkName = hre.network.name;

  if (networkName in deployed) {
    const contractAddr = deployed[networkName];
    const jamfrensKeysV1 = await hre.ethers.getContractAt(
      'JamfrensKeysV1',
      contractAddr
    );
    const jamfrensLensKey = await hre.ethers.getContractAt(
      'JamfrensLensKey',
      jamfrensKeysV1.jamfrensLensKey()
    );
    global.jamfrensKeysV1 = jamfrensKeysV1;
    global.jamfrensLensKey = jamfrensLensKey;
    global.deploy = deploy;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function deploy() {
  const networkName = hre.network.name;
  const factory = await hre.ethers.getContractFactory('JamfrensKeysV1');

  console.log(`deploy jamfrensKeysV1, network = ${networkName}`);
  await confirmDeploy();

  const jamfrensKeysV1 = await factory.deploy(lensHub[networkName]);
  await jamfrensKeysV1.deployed();
  global.jamfrensKeysV1 = jamfrensKeysV1;

  console.log(
    `jamfrensKeysV1 deployed to ${hre.network.name} at ${jamfrensKeysV1.address}`
  );

  return jamfrensKeysV1.address;
}
