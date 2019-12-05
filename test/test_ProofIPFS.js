const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

// contract address : zil189lz6gkpwhqtma7mlq26h5fryk0n0f0xz0hvus
const contract_address_dev = '0x397E2d22c175c0bDF7dbF815AbD123259f37A5E6';

// TODO
contract_address_provided = process.argv[3];

//  [network, id, account_private_key]
const networks = [
    ['http://localhost:4200',       111, 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3'],
    ['https://dev-api.zilliqa.com', 333, '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c'],
    ['https://api.zilliqa.com',       1, '']
];

const network_name  = (process.argv[2] ? process.argv[2].toLowerCase() : 'local'); // local is default if not provided
const network_index = Math.max(['local', 'dev', 'main'].indexOf(network_name), 0); // set to local if network_name not valid
const [network, chain_id, privateKey] = networks[network_index];  // grab parameter of network

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

const params_default =       {
    // amount, gasPrice and gasLimit must be explicitly provided
    version: VERSION,
    amount: new BN(0),
    gasPrice: myGasPrice,
    gasLimit: Long.fromNumber(8000),
}

async function testBlockchain() {
    try {

    /*** Function implementing contract interfaces ***/
    /* get state information from blockchain node - faster than contract transition */

    // we need this workaround until getSubState is working on kaya local network
    async function contract_getSubState(state_filter) {
        full_state = await proof_ipfs.getState();
        return full_state;
    }

    async function getPrice() {
        let substate = await contract_getSubState('price');
        return (substate ? parseInt(substate.price) : 0);
    }

    async function getBalance() {
        let state = await contract_getSubState('_balance');
        console.log({state});
        return (state ? parseInt(state._balance) : 0);
    }

    async function getRegistration(ipfs_cid) {
        let state = await contract_getSubState('ipfsInventory', [ipfs_cid]);
        return (state ? state.ipfsInventory[ipfs_cid].arguments : []);
    }

    async function getItemList(address) {
        let a = address.toLowerCase();
        let state = await contract_getSubState('registered_items', [a]);
        return (state ? state.registered_items[a] : []);
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

    console.log('The state of the contract is:');
    console.log(JSON.stringify(await proof_ipfs.getState(), null, 4));

    } catch (err) {
        console.log(err);
    }
}

testBlockchain();
