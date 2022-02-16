const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');
const Fast = artifacts.require('Fast');
const FastswapFactory = artifacts.require('FastswapFactory');
const FastswapRouter02 = artifacts.require('FastswapRouter02');
const Timelock = artifacts.require('Timelock');
const { address } = require('../env.json');

const ether = (n) => web3.utils.toWei(n, 'ether');

async function addLP(id, name, token0, token1, amount, deployer, fastswapFactory, masterchef, network) {
  console.log('\n'+name);
  console.log(network);

  if (network == 'testnet') {
    const router = await FastswapRouter02.at('0x211A47A691c84D3576Ff081ff9709F19F0813983');
    if (name !== 'FAST/BNB') {
      const token = await deployer.deploy(MockERC20, name, name, ether('200'));
      console.log('Deploy token for testnet: ' + name + "\nAddress: " + token.address);
      token0 = token
    }
    await token0.approve(router.address, ether('10'));
    await router.addLiquidityETH(token0.address, ether('10'), 0, 0, address, 1636667466, { value: ether('0.001') });
    console.log('Add Liquidity ETH!');
  }

  console.log('Pair: ' + token0.address + '-' + token1);

  let pair = await fastswapFactory.getPair.call(token0.address, token1);
  if (pair == '0x0000000000000000000000000000000000000000') {
    console.log('Pair doesn\'t exist, creating...');
    await fastswapFactory.createPair(token0, token1);
    pair = await fastswapFactory.getPair.call(token0, token1);
  }

  console.log('Pair address: ' + pair);
  await masterchef.add(ether(amount), pair, false);

  if (network == 'testnet') {
    const lpAmount = ether('0.001')
    const pairContract = await MockERC20.at(pair);
    await pairContract.approve(masterchef.address, lpAmount);
    await masterchef.deposit(id, lpAmount);
    console.log('Deposit to MasterChef testnet');
  }
  console.log('----------------------------------------------------');
}

async function dev(id, name, amount, deployer, masterchef) {
  const pair = await deployer.deploy(MockERC20, `${name}/BNB`, name, ether('200'));
  await masterchef.add(ether(amount), pair.address, false);
  await pair.approve(masterchef.address, ether('100'));
  await masterchef.deposit(id, ether('100'));
}

module.exports = function (deployer, network) {
  deployer.then(async () => {
    if (network === 'development' || network === 'test' || network === 'soliditycoverage' || network == 'otherhost') {}
    else if (network == 'dev') {
      const fast = await deployer.deploy(MockERC20, 'FAST Token', 'FAST', ether('1000000'));

      const ts = new Date().getTime();
      const masterchef = await deployer.deploy(MasterChef, fast.address, ts + 30 * 60);
      await fast.transfer(masterchef.address, ether('135000'));

      await dev(0, 'FAST', '20000', deployer, masterchef);

      // await dev(1, 'MVP', '7500', deployer, masterchef);

      // await dev(2, 'YFT', '7500', deployer, masterchef);

      await dev(1, 'CAKE', '5000', deployer, masterchef);

      await dev(2, 'ETH', '5000', deployer, masterchef);

      await dev(3, 'SUSHI', '5000', deployer, masterchef);

      await dev(4, 'DODO', '5000', deployer, masterchef);

      await dev(5, 'COMP', '5000', deployer, masterchef);

      await dev(6, 'DAI', '5000', deployer, masterchef);

      await dev(7, 'BAND', '5000', deployer, masterchef);

      await dev(8, 'DOT', '5000', deployer, masterchef);

      await dev(9, 'LINK', '5000', deployer, masterchef);

      await dev(10, 'USDT', '5000', deployer, masterchef);

      await dev(11, 'UNI', '5000', deployer, masterchef);

      await dev(12, 'SXP', '5000', deployer, masterchef);

      await dev(13, 'USDC', '5000', deployer, masterchef);

      await dev(14, '1INCH', '5000', deployer, masterchef);

      await dev(15, 'YFI', '5000', deployer, masterchef);

      await dev(16, 'AAVE', '5000', deployer, masterchef);

      await dev(17, 'SNX', '5000', deployer, masterchef);

      await dev(18, 'SafeMoon', '5000', deployer, masterchef);

      await dev(19, 'BSCPAD', '5000', deployer, masterchef);

      await dev(20, 'VENUS', '5000', deployer, masterchef);

      await dev(21, 'Bake', '5000', deployer, masterchef);

      await dev(22, 'SPARTAN', '5000', deployer, masterchef);

      await dev(23, 'Waultswap', '5000', deployer, masterchef);

    } else if (network == 'testnet' || network == 'bsc') {
      await deployer.deploy(Timelock, address, 172800);

      let fastTokenAddress;
      if (network == 'testnet') {
        const token = await deployer.deploy(MockERC20, 'Fast', 'FAST', ether('100000000000'));
        fastTokenAddress = token.address;
      } else if (network == 'bsc') {
        fastTokenAddress = '0x4d338614fc25afe6edf3994f331b4bad32fb3c6a';
      }

      let wBNB;
      if (network == 'testnet') {
        wBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
      } else if (network == 'bsc') {
        wBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
      }

      const fastswapFactory = await FastswapFactory.at('0x59DA12BDc470C8e85cA26661Ee3DCD9B85247C88');
      let start;
      if (network == 'testnet') {
        start = 1621215629;
      } else if (network == 'bsc') {
        // Thu May 20 2021 17:00:00 GMT+0000
        start = 1621530000;
      }

      const fast = await Fast.at(fastTokenAddress);

      const masterchef = await deployer.deploy(MasterChef, fastTokenAddress, start);
      
      // await fast.transfer(masterchef.address, ether('135000'));

      // FAST/BNB
      await addLP(0, 'FAST/BNB', fast, wBNB, '20000', deployer, fastswapFactory, masterchef, network);

      // MVP/BNB
      // await addLP('MVP/BNB', '', wBNB, '7500', fastswapFactory, masterchef);

      // YFT/BNB
      // await addLP('YFT/BNB', '0xB5257E125C9311B61CA7a58b3C11cB8806AFaC1f', wBNB, '7500', fastswapFactory, masterchef);

      // CAKE/BNB
      await addLP(1, 'CAKE/BNB', '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // ETH/BNB
      await addLP(2, 'ETH/BNB', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // SUSHI/BNB
      await addLP(3, 'SUSHI/BNB', '0x947950bcc74888a40ffa2593c5798f11fc9124c4', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // DODO/BNB
      await addLP(4, 'DODO/BNB', '0x67ee3cb086f8a16f34bee3ca72fad36f7db929e2', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // COMP/BNB
      await addLP(5, 'COMP/BNB', '0x52ce071bd9b1c4b00a0b92d298c512478cad67e8', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // DAI/BNB
      await addLP(6, 'DAI/BNB', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // BAND/BNB
      await addLP(7, 'BAND/BNB', '0xad6caeb32cd2c308980a548bd0bc5aa4306c6c18', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // DOT/BNB
      await addLP(8, 'DOT/BNB', '0x7083609fce4d1d8dc0c979aab8c869ea2c873402', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // LINK/BNB
      await addLP(9, 'LINK/BNB', '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // USDT/BNB
      await addLP(10, 'USDT/BNB', '0x55d398326f99059ff775485246999027b3197955', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // UNI/BNB
      await addLP(11, 'UNI/BNB', '0xbf5140a22578168fd562dccf235e5d43a02ce9b1', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // SXP/BNB
      await addLP(12, 'SXP/BNB', '0x47bead2563dcbf3bf2c9407fea4dc236faba485a', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // USDC/BNB
      await addLP(13, 'USDC/BNB', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // 1INCH/BNB
      await addLP(14, '1INCH/BNB', '0x111111111117dC0aa78b770fA6A738034120C302', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // YFI/BNB
      await addLP(15, 'YFI/BNB', '0x88f1a5ae2a3bf98aeaf342d26b30a79438c9142e', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // AAVE/BNB
      await addLP(16, 'AAVE/BNB', '0xfb6115445bff7b52feb98650c87f44907e58f802', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // SNX/BNB
      await addLP(17, 'SNX/BNB', '0x9ac983826058b8a9c7aa1c9171441191232e8404', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // SafeMoon/BNB
      await addLP(18, 'SafeMoon/BNB', '0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // BSCPAD/BNB
      await addLP(19, 'BSCPAD/BNB', '0x5a3010d4d8d3b5fb49f8b6e57fb9e48063f16700', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // VENUS/BNB
      await addLP(20, 'VENUS/BNB', '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // Bake/BNB
      await addLP(21, 'Bake/BNB', '0xe02df9e3e622debdd69fb838bb799e3f168902c5', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // SPARTAN/BNB
      await addLP(22, 'SPARTAN/BNB', '0xe4ae305ebe1abe663f261bc00534067c80ad677c', wBNB, '5000', deployer, fastswapFactory, masterchef, network);

      // Waultswap/BNB
      await addLP(23, 'Waultswap/BNB', '0xa9c41a46a6b3531d28d5c32f6633dd2ff05dfb90', wBNB, '5000', deployer, fastswapFactory, masterchef, network);
    }
  });
};
