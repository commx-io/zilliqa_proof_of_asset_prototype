const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');


// const {ProofIPFS_API, myGasPrice} = require('../lib/ProofIPFS_API');


// contract address : zil189lz6gkpwhqtma7mlq26h5fryk0n0f0xz0hvus
const contract_address_dev = '0x397E2d22c175c0bDF7dbF815AbD123259f37A5E6';

contract_address_provided = process.argv[3];

//  [network, id, account_private_key]
const networks = [
    ['http://localhost:4200',       111, 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3'],
    ['https://dev-api.zilliqa.com', 333, '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c'],
    ['https://api.zilliqa.com',       1, '']
];

const network_name  = (process.argv[2] ? process.argv[2].toLowerCase() : 'local'); // local is default if not provided
const network_index = Math.max(['local', 'dev', 'main'].indexOf(network_name), 0); // set to local if network_name not valid
const [network, chain_id, privateKey_0] = networks[network_index];  // grab parameter of network

// Account 1 - Testnet
// zil1amx97t2vsu59z2w8xqdvakl5cyevgfzj8mhmmz
// 0xeEcC5F2D4C87285129c7301Acedbf4c132c42452
const privateKey_1 = '103c44eff7bbedeefaa4b080da913d7b3b00013fabc1606651422b18ba1b1dc8';

const privateKey = privateKey_0;


const MSG_VERSION = 1;
const VERSION = bytes.pack(chain_id, MSG_VERSION);

console.log({network});

const zilliqa = new Zilliqa(network);

zilliqa.wallet.addByPrivateKey(privateKey);

const address = getAddressFromPrivateKey(privateKey);

console.log({zilliqa});
console.log(`My account address is: ${address}`);
console.log(`My account bech32 address is: ${toBech32Address(address)}`);

const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions

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
        value: address.toString(),
    },
];

// amount, gasPrice and gasLimit must be explicitly provided
const params_default = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: myGasPrice,
    gasLimit: Long.fromNumber(8000),
}

async function testBlockchain() {
    try {

    /*** Function implementing contract interfaces ***/
	// get state information from blockchain node - faster than contract transition */
	// https://github.com/Zilliqa/Zilliqa-JavaScript-Library/blob/dev/examples/queryState.js

    // we need this workaround until getSubState is working on kaya local network
    async function contract_getSubState(selector_not_used) {
        const full_state = await proof_ipfs.getState();
        return full_state;
    }

    async function getPrice() {
        let substate = await contract_getSubState('price');
        return (substate ? parseInt(substate.price) : 0);
    }

    async function getBalance() {
        let state = await contract_getSubState('_balance');
        return (state ? parseInt(state._balance) : 0);
    }

    async function getRegistration(ipfs_cid) {
		let reg_info = [];
		if (network_index != 0) {
			// this is for the real Zilliqa test and main blockchain
        	let state = await ipfs_cid.proof_ipfs('ipfsInventory', [ipfs_cid]);
			reg_info = (state ? state.ipfsInventory[ipfs_cid].arguments : []);
		} else {
			// workaround to get it to work on kaya local network
			const full_state = await proof_ipfs.getState();
			const item = full_state.ipfsInventory.find(o => o.key == ipfs_cid);
			reg_info = (item ? item.val.arguments : []);
		}
        return reg_info;
    }

    async function getItemList(one_address) {
		let a = one_address.toLowerCase();
		let item_list = [];
		if (network_index != 0) {
			// this is for the real Zilliqa test and main blockchain
			const state = await proof_ipfs.getSubState('registered_items', [a]);
			item_list = (state ? state.registered_items[a] : []);
		} else {
			// workaround to get it to work on kaya local network
			const full_state = await proof_ipfs.getState();
			const ri = full_state.registered_items;
			const reg_info = ri.find(o => o.key == a);
			item_list = (reg_info ? reg_info.val : [])
		}
		return item_list
    }

    async function getPrice_fromContract() {
        const callTxGet = await proof_ipfs.call('getPrice', [], params_default);
        const receipt_get = callTxGet.txParams.receipt;
        const p = receipt_get.event_logs[0].params;
        return (p[0]['value'] ? parseInt(p[0]['value']) : 0);
    }

    async function setPrice(new_price) {
        const callTx = await proof_ipfs.call('setPrice',
            [{
                vname: 'new_price',
                type : 'Uint128',
                value: new_price.toString(),
            }],
            params_default
        );
        return callTx // .txParams.receipt;
    }

    async function registerOwnership(ipfs_cid, metadata) {
        const price  = await getPrice();
        console.log({price});
        let params_register = params_default;
        params_register.amount = new BN(price);
        console.log({params_register})
        const callTx = await proof_ipfs.call('registerOwnership',
            [{
                vname: 'ipfs_cid',
                type : 'String',
                value: ipfs_cid,
            },
            {
                vname: 'metadata',
                type : 'String',
                value: metadata,
            }], 
            params_register
        );
        return callTx // .txParams.receipt;
    }

    // *** main section *********************************************************************

    // Get Balance
    const balance = await zilliqa.blockchain.getBalance(address);
    // Get Minimum Gas Price from blockchain
    const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();

    // Account balance (See note 1)
    console.log(`Your account balance is:`);
    console.log(balance.result);
    console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);
    
    console.log(`My Gas Price ${myGasPrice.toString()}`);
    const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
    console.log(`Is the gas price sufficient? ${isGasSufficient}`);

    console.log("init = ", init);

    if (typeof contract_address_provided == 'undefined') {
        console.log(`Deploying a new contract....`);
        const code = fs.readFileSync('contracts/ProofIPFS.scilla', 'utf-8');
        const contract = zilliqa.contracts.new(code, init);
        [deployTx, proof_ipfs] = await contract.deploy({
            version: VERSION,
            gasPrice: myGasPrice,
            gasLimit: Long.fromNumber(15000),
        });
        // Introspect the state of the underlying transaction
        console.log(`Deployment Transaction ID: ${deployTx.id}`);
        console.log(`Deployment Transaction Receipt:`);
        console.log(deployTx.txParams.receipt);
    } else if (contract_address_provided == 'default') {
        proof_ipfs = zilliqa.contracts.at(contract_address_dev)
    } else {
        proof_ipfs = zilliqa.contracts.at(contract_address_provided)
	}
	
    // Get the deployed contract address
    console.log('The contract address is:');
    console.log(proof_ipfs.address);

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));

    console.log('calling getPrice())');
    console.log(await getPrice() );
    console.log('calling getPrice_fromContract()');
    console.log(await getPrice_fromContract() );

    console.log('calling setPrice(2000)');
    const result = await setPrice(2000);
    console.log({result});

    console.log('calling getPrice())');
    console.log(await getPrice() );
    console.log('calling getPrice_fromContract()');
    console.log(await getPrice_fromContract() );

    console.log('calling getBalance()');
    console.log(await getBalance() );

    const item_1 = 'Qm001';
    const meta_1 = 'metadata_1';

    // const tx4 = await registerOwnership('Qm004', 'metadata_4');
    // console.log({tx4});

/*
    const tx2 = await registerOwnership('Qm101','first item of Account 1');
    console.log({tx2});

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));

*/
    const reg_info_1 = await getRegistration('Qm001');
    console.log({reg_info_1});

    const reg_info_2 = await getRegistration('Qm000');
    console.log({reg_info_2});

    const reg_info_3 = await getRegistration('Qm004');
    console.log({reg_info_3});

    console.log("getItemList", address);
    const items_1 = await getItemList(address);
    console.log({items_1});

    const items_0 = await getItemList("0x0000000000000000000000000000000000000000");
    console.log({items_0});

    } catch (err) {
        console.log(err);
    }
}

testBlockchain();
