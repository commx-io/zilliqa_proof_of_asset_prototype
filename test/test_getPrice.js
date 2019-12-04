const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');
const assert = require('assert');

// contract address : zil189lz6gkpwhqtma7mlq26h5fryk0n0f0xz0hvus
const contract_address_dev = '397E2d22c175c0bDF7dbF815AbD123259f37A5E6';
// TODO
contract_address_provided = process.argv[3];

//  [network, id, account_private_key]
const networks = [
    ['http://localhost:4200',       111, 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3'],
    ['https://dev-api.zilliqa.com', 333, '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c'],
    ['https://api.zilliqa.com',       1, '']
];

const network_name  = (process.argv[2] ? process.argv[2].toLowerCase() : 'local');
const network_index = Math.max(['local', 'dev', 'main'].indexOf(network_name), 0);
const [network, chain_id, privateKey] = networks[network_index];

const MSG_VERSION = 1;
const VERSION = bytes.pack(chain_id, MSG_VERSION);

console.log({network});

const zilliqa = new Zilliqa(network);
zilliqa.wallet.addByPrivateKey(privateKey);
const account_address = getAddressFromPrivateKey(privateKey);

console.log('account_address =', account_address);

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
      value: `${account_address}`,
    },
  ];

async function deployContract(source) {
    // Instance of class Contract
    const contract = zilliqa.contracts.new(source, init);

    // Deploy the contract
    return [deployTx, proof_ipfs] = await contract.deploy({
        version: VERSION,
        gasPrice: myGasPrice,
        gasLimit: Long.fromNumber(15000),
    });
}

async function testProofIPFS() {
    try {
        // const network_id = await zilliqa.network.GetNetworkId();    // iget id from network
        // const CHAIN_ID = network_id.result;                         // ignore id from networks list

        console.log('myGasPrice =', myGasPrice.toString(10));  // BN to String base 10

        if (contract_address_provided) {
            proof_ipfs = zilliqa.contracts.at(contract_address_provided)
        } else {
            console.log(`Deploying a new contract....`);
            const source = fs.readFileSync('contracts/ProofIPFS.scilla', 'utf-8');
            [deployTx, proof_ipfs] = await deployContract(source);
        }

        console.log('\n\n---------------------------------------');
        const stateContract = await proof_ipfs.getState();
        console.log(stateContract);
        console.log('---------------------------------------');

        /*** Function implementing contract interfaces ***/
        /* get state information from blockchain node - faster than contract transition */

        async function getPrice() {
            let state = await proof_ipfs.getSubState('price');
            return (state ? parseInt(state.price) : 0);
        }

        async function getBalance() {
            let state = await proof_ipfs.getSubState('_balance');
            return (state ? parseInt(state._balance) : 0);
        }

        async function getRegistration(ipfs_cid) {
            let state = await proof_ipfs.getSubState('ipfsInventory', [ipfs_cid]);
            return (state ? state.ipfsInventory[ipfs_cid].arguments : []);
        }

        async function getItemList(address) {
            let a = address.toLowerCase();
            let state = await proof_ipfs.getSubState('registered_items', [a]);
            return (state ? state.registered_items[a] : []);
        }


        console.log("price =", await getPrice() );
        console.log("_balance =", await getBalance() );
        console.log(await getRegistration('Qm001'));
        console.log(await getRegistration('Qm002'));
        console.log(await getItemList(account_address));

        /*
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
        */
    } catch (err) {
        console.log('Blockchain Error');
        console.log(err);
    }
}

testProofIPFS();