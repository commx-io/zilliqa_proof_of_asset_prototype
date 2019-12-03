const fs = require('fs');
const {BN, Long, bytes} = require('@zilliqa-js/util');
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

// *** CONFIG HERE ***
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
		
		const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
    
        const proof_ipfs = zilliqa.contracts.at('0x397E2d22c175c0bDF7dbF815AbD123259f37A5E6');

        const params_default = {
            version: VERSION,
            gasPrice: minGasPrice,
            gasLimit: Long.fromNumber(5000),
        }

        console.log("calling getPrice()");
        const callTx = await proof_ipfs.call('getPrice', [], params_default);
        console.log("done");

        // Retrieving the transaction receipt (See note 2)
        const {receipt} = callTx.txParams;
        console.log(JSON.stringify(receipt, null, 4));

        //Get the contract state
        console.log('Getting contract state...');
        const state = await proof_ipfs.getState();

    } catch (err) {
        console.log('Blockchain Error');
        console.log(err);
    }
}

testProofIPFS();