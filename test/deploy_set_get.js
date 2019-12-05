const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {
  toBech32Address,
  getAddressFromPrivateKey,
} = require('@zilliqa-js/crypto');

// const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
const zilliqa = new Zilliqa('http://localhost:4200');

// These are set by the core protocol, and may vary per-chain.
// You can manually pack the bytes according to chain id and msg version.
// For more information: https://apidocs.zilliqa.com/?shell#getnetworkid

const chainId = 111; // chainId for kaya local blockchain
// const chainId = 333; // chainId for developer testnet

const msgVersion = 1; // current msgVersion
const VERSION = bytes.pack(chainId, msgVersion);

// Populate the wallet with an account for Testnet
// const privateKey = '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c';

// account 0 on kaya
const privateKey = 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3';

zilliqa.wallet.addByPrivateKey(privateKey);

const address = getAddressFromPrivateKey(privateKey);

console.log({zilliqa});
console.log(`My account address is: ${address}`);
console.log(`My account bech32 address is: ${toBech32Address(address)}`);

async function testBlockchain() {
  try {
    // Get Balance
    const balance = await zilliqa.blockchain.getBalance(address);
    // Get Minimum Gas Price from blockchain
    const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();

    // Account balance (See note 1)
    console.log(`Your account balance is:`);
    console.log(balance.result);
    console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);
	const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions
	
    console.log(`My Gas Price ${myGasPrice.toString()}`);
    const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
    console.log(`Is the gas price sufficient? ${isGasSufficient}`);
        
    console.log(`Deploying a new contract....`);
    const code = fs.readFileSync('contracts/ProofIPFS.scilla', 'utf-8');

    const init = [
      // this parameter is mandatory for all init arrays
      {
        vname: '_scilla_version',
        type: 'Uint32',
        value: '0',
      },
      {
        vname: 'owner',
        type: 'ByStr20',
        value: `${address}`,
      },
    ];
    
    console.log("init = ", init);

    // Instance of class Contract
    const contract = zilliqa.contracts.new(code, init);

    // Deploy the contract
    const [deployTx, proof_ipfs] = await contract.deploy({
      version: VERSION,
      gasPrice: myGasPrice,
      gasLimit: Long.fromNumber(15000),
    });

    // Introspect the state of the underlying transaction
    console.log(`Deployment Transaction ID: ${deployTx.id}`);
    console.log(`Deployment Transaction Receipt:`);
    console.log(deployTx.txParams.receipt);

    // Get the deployed contract address
    console.log('The contract address is:');
    console.log(proof_ipfs.address);
    //Following line added to fix issue https://github.com/Zilliqa/Zilliqa-JavaScript-Library/issues/168
    const deployedContract = zilliqa.contracts.at(proof_ipfs.address);

	const params_default =       {
        // amount, gasPrice and gasLimit must be explicitly provided
        version: VERSION,
        amount: new BN(0),
        gasPrice: myGasPrice,
        gasLimit: Long.fromNumber(8000),
	  }

    console.log('Calling setPrice(1000)');
    const callTx = await proof_ipfs.call(
      'setPrice',
      [
        {
          vname: 'new_price',
          type: 'Uint128',
          value: '1000',
        },
      ],
	  params_default
    );

    // Retrieving the transaction receipt (See note 2)
    console.log(JSON.stringify(callTx.receipt, null, 4));

    //Get the contract state
    console.log('Getting contract state...');
    const state = await deployedContract.getState();
    console.log('The state of the contract is:');
	console.log(JSON.stringify(state, null, 4));

	async function getPrice_fromContract() {
		const callTxGet = await proof_ipfs.call('getPrice', [], params_default);
		const receipt_get = callTxGet.txParams.receipt;
		const p = receipt_get.event_logs[0].params;
		return (p[0]['value'] ? parseInt(p[0]['value']) : 0);
	}

	console.log('calling getPrice()');
	console.log(await getPrice_fromContract() );
	
	/*
	console.log("\n\nCalling getPrice()");
    const callTxGet = await proof_ipfs.call('getPrice', [], params_default);
    console.log('callTxGet =', callTxGet)
    const receipt_get = callTxGet.txParams.receipt;
    console.log('receipt_get =', receipt_get)
    */

  } catch (err) {
    console.log(err);
  }
}

testBlockchain();
