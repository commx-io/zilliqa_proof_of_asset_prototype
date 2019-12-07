const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

const {ProofIPFS_API, myGasPrice} = require('../lib/ProofIPFS_API');

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

console.log("zilliqa = ");
console.log(JSON.stringify(zilliqa, null, 4));

zilliqa.wallet.addByPrivateKey(privateKey);

const address = getAddressFromPrivateKey(privateKey);

console.log({zilliqa});
console.log(`My account address is: ${address}`);
console.log(`My account bech32 address is: ${toBech32Address(address)}`);

// const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions

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
/*
// amount, gasPrice and gasLimit must be explicitly provided
const params_default = {
    version: VERSION,
    amount: new BN(0),
    gasPrice: myGasPrice,
    gasLimit: Long.fromNumber(8000),
}
*/
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
    
    console.log(`My Gas Price ${myGasPrice.toString()}`);
    const isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
    console.log(`Is the gas price sufficient? ${isGasSufficient}`);

    console.log("init = ", init);
    
    // get deployed contract ---------------------------------------------

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
    
    console.log("getInit() =", JSON.stringify(await proof_ipfs.getInit()));

    // get JS API to contract ---------------------------------------------

    contract_api = new ProofIPFS_API(proof_ipfs, chain_id);
    if (network_index == 0) contract_api.setKaya(true);	// workround to fix kaya getState and getSubState errors

    console.log(ProofIPFS_API.TEST);

    console.log("contract_api.getKaya() =", contract_api.getKaya());

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

    console.log('calling setPrice(${price_registration}) [Qa]');
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

    // const tx4 = await contract_api.registerOwnership('Qm004', 'metadata_4');
    // console.log({tx4});

/*
    const tx2 = await contract_api.registerOwnership('Qm101','first item of Account 1');
    console.log({tx2});

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));

*/
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
