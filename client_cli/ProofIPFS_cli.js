/* eslint-env node, mocha */

const fs = require('fs');
const { BN, Long, bytes, units, validation } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {fromBech32Address, toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

const {addressEqual} = require ('../lib/addressEqual');
const {ProofIPFS_API, myGasPrice} = require('../lib/ProofIPFS_API');

console.log("ProofIPFS_API.myGasPrice  =", myGasPrice);

// contract address : zil189lz6gkpwhqtma7mlq26h5fryk0n0f0xz0hvus
const contract_address_dev = '0x397E2d22c175c0bDF7dbF815AbD123259f37A5E6';

network_choice = process.argv[2] || 'kaya';
contract_address_provided = process.argv[3];

// [network, chain_id, privateKey, account_address, timeout_deploy, timeout_transition]
const networks = {
	kaya : ['http://localhost:4200',
			111,
			'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3',
			'0x7bb3b0e8a59f3f61d9bff038f4aeb42cae2ecce8',
			10000,
			5000],
	dev  : ['https://dev-api.zilliqa.com',
			333,
			'447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c',
			'zil1pw587sm57lvlu0wlwkc3gw2sddy35au6esw589',
			180000,
			180000],
    main : ['https://api.zilliqa.com',       1, '', '', 180000, 180000]
};

network_parameter = networks[network_choice.toLowerCase()]
if (network_parameter == null)
	throw new Error("unknown blockchain network");
console.log({network_parameter});
const [network, chain_id, privateKey, account_address, timeout_deploy, timeout_transition] = network_parameter;

// Account 1 - Testnet
// zil1amx97t2vsu59z2w8xqdvakl5cyevgfzj8mhmmz
// 0xeEcC5F2D4C87285129c7301Acedbf4c132c42452
const privateKey_1 = '103c44eff7bbedeefaa4b080da913d7b3b00013fabc1606651422b18ba1b1dc8';

const MSG_VERSION = 1;
const VERSION = bytes.pack(chain_id, MSG_VERSION);

console.log({network});

const zilliqa = new Zilliqa(network);

zilliqa.wallet.addByPrivateKey(privateKey);
/*
function addressEqual(address_a, address_b) {
	let a = '';
	let b = '';
	if (validation.isBech32(address_a))
		a = fromBech32Address(address_a)
	else
		a = (address_a.substring(0,2) == '0x' ? address_a : '0x' + address_a);
	if (validation.isBech32(address_b))
		b = fromBech32Address(address_b)
	else
		b = (address_b.substring(0,2) == '0x' ? address_b : '0x' + address_b);
	return a.toLowerCase() == b.toLowerCase();
}
*/
const address = getAddressFromPrivateKey(privateKey);

console.log(`My account address is: ${address}`);
console.log(`My account bech32 address is: ${toBech32Address(address)}`);

console.log("addressEqual(address, account_address) =", addressEqual(address, account_address));


async function testBlockchain() {
    try {

// check balance and Gas

    const balance = await zilliqa.blockchain.getBalance(address);
    console.log(`Your account balance is:`);
    console.log(balance.result);

    // Get Minimum Gas Price from blockchain
    const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
    console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);

    console.log(`My Gas Price ${myGasPrice.toString()}`);
    const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
    console.log(`Is the gas price sufficient? ${isGasSufficient}`);

    // get deployed contract otherwise  deploy a new one 

    if (typeof contract_address_provided == 'undefined') {
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
                value: address.toString(),
            },
        ];

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
    
    /* get JS API to contract --------------------------------------------- */

    contract_api = new ProofIPFS_API(proof_ipfs, chain_id);

    /* use ProofIPFS_API from here ---------------------------------------- */

    // Get the deployed contract address
    console.log('The contract address is:');
    console.log(proof_ipfs.address);

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));


    console.log('calling getPrice())');
    console.log(await contract_api.getPrice() );
    console.log('calling getPrice_fromContract()');
    console.log(await contract_api.getPrice_fromContract() );
    
    const price_registration = units.toQa(1, units.Units.Zil);

    console.log("calling setPrice(${price_registration}) [Qa]");
    const result = await contract_api.setPrice(price_registration);
    console.log({result});

    console.log('calling getPrice())');
    console.log(await contract_api.getPrice() );
    console.log('calling getPrice_fromContract()');
    console.log(await contract_api.getPrice_fromContract() );

    console.log('calling getBalance()');
    console.log(await contract_api.getBalance() );

    const item_1 = 'Qm001';
    const meta_1 = 'metadata_1';

    const tx1 = await contract_api.registerOwnership(item_1, meta_1);
	console.log({tx1});
	
	const tx1_again = await contract_api.registerOwnership(item_1, meta_1);
	console.log("try to register items_1 again")
    console.log(JSON.stringify(tx1_again));

    const tx2 = await contract_api.registerOwnership('Qm101','first item of Account 1');
    console.log({tx2});

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));


    const reg_info_1 = await contract_api.getRegistration('Qm001');
    console.log({reg_info_1});

    const reg_info_2 = await contract_api.getRegistration('Qm000');
    console.log({reg_info_2});

    const reg_info_3 = await contract_api.getRegistration('Qm004');
    console.log({reg_info_3});

    console.log("getItemList", address);
    const items_1 = await contract_api.getItemList(address);
    console.log({items_1});

    const items_0 = await contract_api.getItemList("0x0000000000000000000000000000000000000000");
    console.log({items_0});

    } catch (err) {
        console.log(err);
    }
}

testBlockchain();
