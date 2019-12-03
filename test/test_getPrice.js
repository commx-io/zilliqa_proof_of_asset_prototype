const fs = require('fs');
const {BN, Long, bytes,units} = require('@zilliqa-js/util');
const {Zilliqa} = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

const network_main     = 'https://api.zilliqa.com';
const network_main_id  = 1;
const network_dev      = 'https://dev-api.zilliqa.com';
const network_dev_id   = 333;
const network_local    = 'http://localhost:4200';
const network_local_id = 111;

// Populate the wallet with an account
const privateKey_dev   = '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c';
const privateKey_local = 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3';  // 7bb3b0e8a59f3f61d9bff038f4aeb42cae2ecce8

// *** CONFIG NETWORK HERE ***
const zilliqa    = new Zilliqa(network_dev);
const privateKey = privateKey_dev;
// *** CONFIG END ****

zilliqa.wallet.addByPrivateKey(privateKey);

const ACCOUNT_0_ADDRESS = getAddressFromPrivateKey(privateKey);
console.log('ACCOUNT_0_ADDRESS =', ACCOUNT_0_ADDRESS)

async function testProofIPFS() {
    try {
        const network_id = await zilliqa.network.GetNetworkId();
        const CHAIN_ID = network_id.result;
        console.log("CHAIN_ID =", CHAIN_ID);
        const MSG_VERSION = 1;
		const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);

        const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions
    
        const proof_ipfs = zilliqa.contracts.at('397E2d22c175c0bDF7dbF815AbD123259f37A5E6');

        const params_default = {
            version: VERSION,
            gasPrice: myGasPrice,
            gasLimit: Long.fromNumber(5000),
            amount: new BN(0)
        }

		console.log("\n\nCalling getPrice()");
        const callTxGet = await proof_ipfs.call('getPrice', [], params_default);
        console.log('callTxGet =', callTxGet)
        const receipt_get = callTxGet.txParams.receipt;
		console.log('receipt_get =', receipt_get)
		
		const return_value = receipt_get.event_logs[0].params[0];
		console.log("return_value =", return_value);

    } catch (err) {
        console.log('Blockchain Error');
        console.log(err);
    }
}

testProofIPFS();