const fs = require('fs');
const { BN, Long, bytes } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');

const zilliqa = new Zilliqa('http://localhost:4200');

const CHAIN_ID = 111;
const MSG_VERSION = 1;
const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);

// Populate the wallet with an account
const ACCOUNT_0_ADDRESS = "7bb3b0e8a59f3f61d9bff038f4aeb42cae2ecce8"
zilliqa.wallet.addByPrivateKey(
  'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3',
);

const ACCOUNT_1_ADDRESS = "d90f2e538ce0df89c8273cad3b63ec44a3c4ed82"

async function testProofIPFS() {
  try {
    // Send a transaction to the network
    const tx = await zilliqa.blockchain.createTransaction(
      zilliqa.transactions.new({
        version: VERSION,
        toAddr: ACCOUNT_1_ADDRESS,
        amount: new BN(888),
        // gasPrice must be >= minGasPrice
        gasPrice: new BN('1_000_000_000'),
        // can be `number` if size is <= 2^53 (i.e., window.MAX_SAFE_INTEGER)
        gasLimit: Long.fromNumber(10),
      }),
    );
    console.log(tx);

    console.log('Deploying a contract now');
    // Deploy a contract
    const code = fs.readFileSync('../contracts/ProofIPFS.scilla', 'utf-8');
    const init = [
      {
        vname: '_scilla_version',
        type: 'Uint32',
        value: '0',
      },
      {
        vname: 'owner',
        type: 'ByStr20',
        // NOTE: all byte strings passed to Scilla contracts _must_ be
        // prefixed with 0x. Failure to do so will result in the network
        // rejecting the transaction while consuming gas!
        value: '0x' + ACCOUNT_0_ADDRESS,
      },
	];
	
	console.log("init = ", init);

    // instance of class Contract
    const contract = zilliqa.contracts.new(code, init);

	const [deployTx, proof_ipfs] = await contract.deploy({
      version: VERSION,
      gasPrice: new BN('1_000_000_000'),
      gasLimit: Long.fromNumber(20000),
    });

    // Introspect the state of the underlying transaction
    console.log('Deployment Transaction ID: ', deployTx.id);
    console.log('Deployment Transaction Receipt: ', deployTx.txParams.receipt);

	const callTx = await proof_ipfs.call('setPrice', [
      {
        vname: 'new_price',
        type: 'Uint128',
        value: '1000',
      }],
    {
      version: VERSION,
      amount: new BN(0),
      gasPrice: new BN('1_000_000_000'),
      gasLimit: Long.fromNumber(5000),
	});
	
    // Retrieving the transaction receipt (See note 2)
    const { receipt } = callTx.txParams;
    console.log(JSON.stringify(receipt, null, 4));

    //Get the contract state
    console.log('Getting contract state...');
    const state = await proof_ipfs.getState();
    console.log('The state of the contract is:');
    console.log(JSON.stringify(state, null, 4));
	
  } catch (err) {
    console.log('Blockchain Error');
    console.log(err);
  }
}

testProofIPFS();
