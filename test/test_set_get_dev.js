const fs = require('fs');
const {BN, Long, bytes} = require('@zilliqa-js/util');
const {Zilliqa} = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

const network_dev      = 'https://dev-api.zilliqa.com';
const zilliqa = new Zilliqa(network_dev);

const privateKey_dev   = '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c';
zilliqa.wallet.addByPrivateKey(privateKey_dev);
const ACCOUNT_0_ADDRESS = getAddressFromPrivateKey(privateKey_dev);
console.log('ACCOUNT_0_ADDRESS =', ACCOUNT_0_ADDRESS)


async function testProofIPFS() {
    try {
		const network_id = await zilliqa.network.GetNetworkId();
		const CHAIN_ID = network_id.result;
		console.log("CHAIN_ID =", CHAIN_ID);
		const MSG_VERSION = 1;
		const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);
		console.log('zilliqa.provider =', zilliqa.provider);

        console.log('Deploying a contract now');
        // Deploy a contract
        const code = fs.readFileSync('contracts/ProofIPFS.scilla', 'utf-8');
        const init = [{
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
                value: ACCOUNT_0_ADDRESS,
            },
        ];

        console.log("init = ", init);

        // instance of class Contract
		const contract = zilliqa.contracts.new(code, init);
		
		/*
		async deploy(
			params: DeployParams,
			attempts: number = 33,
			interval: number = 1000,
			toDs: boolean = false,
		): Promise<[Transaction, Contract]>
		*/
		
		/*
		const DeployParams = {
			version: VERSION,
			amount: new BN(0),
			gasPrice: new BN('1_000_000_000'),
			gasLimit: Long.fromNumber(20000)
		};

		const [deployTx, proof_ipfs] = await contract.deploy(
			DeployParams, 20, 1000, true);
		*/

		const [deployTx, proof_ipfs] = await contract.deploy({
			version: VERSION,
			gasPrice: new BN('1_000_000_000'),
			gasLimit: Long.fromNumber(15000),
		  });

		console.log("contract.address =", contract.address)

        // Introspect the state of the underlying transaction
        console.log('Deployment Transaction ID: ', deployTx.id);
        console.log('Deployment Transaction Receipt: ', deployTx.txParams.receipt);

        const params_default = {
            version: VERSION,
            amount: new BN(0),
            gasPrice: new BN('1_000_000_000'),
            gasLimit: Long.fromNumber(5000),
        }

		console.log("\n\nCalling setPrice()")
        const callTx = await proof_ipfs.call('setPrice', [{
            vname: 'new_price',
            type: 'Uint128',
            value: '1000',
            }], 
            params_default
        );

        // Retrieving the transaction receipt (See note 2)
        const {receipt} = callTx.txParams;
        console.log(JSON.stringify(receipt, null, 4));

        //Get the contract state
        console.log('\n\nGetting contract state...');
        const state = await proof_ipfs.getState();
        console.log(JSON.stringify(state, null, 4));

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