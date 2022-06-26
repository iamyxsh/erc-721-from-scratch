import Web3 from "web3";
const BridgeMum = require("../../artifacts/contracts/Tokenbridge/BridgeMumbai.sol/BridgeMumbai.json");
const BridgeRink = require("../../artifacts/contracts/Tokenbridge/BridgeRinkeby.sol/BridgeRinkeby.json");

const web3Mum = new Web3("https://rpc-mumbai.maticvigil.com");
const web3Rink = new Web3(
  "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
);
const adminPrivKey = process.env.ADMIN_PRIVATE_KEY;
const { address: admin } = web3Mum.eth.accounts.wallet.add(adminPrivKey!);

const bridgeEth = new web3Rink.eth.Contract(
  BridgeRink.abi,
  BridgeEth.networks["4"].address
);

const bridgeBsc = new web3Bsc.eth.Contract(
  BridgeBsc.abi,
  BridgeBsc.networks["97"].address
);

bridgeEth.events
  .Transfer({ fromBlock: 0, step: 0 })
  .on("data", async (event) => {
    const { from, to, amount, date, nonce, signature } = event.returnValues;

    const tx = bridgeBsc.methods.mint(from, to, amount, nonce, signature);
    const [gasPrice, gasCost] = await Promise.all([
      web3Bsc.eth.getGasPrice(),
      tx.estimateGas({ from: admin }),
    ]);
    const data = tx.encodeABI();
    const txData = {
      from: admin,
      to: bridgeBsc.options.address,
      data,
      gas: gasCost,
      gasPrice,
    };
    const receipt = await web3Bsc.eth.sendTransaction(txData);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    console.log(`
    Processed transfer:
    - from ${from} 
    - to ${to} 
    - amount ${amount} tokens
    - date ${date}
    - nonce ${nonce}
  `);
  });
