/* eslint-env node, mocha */

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert; // require('assert');

const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');

const {ProofIPFS_API, myGasPrice} = require('../lib/ProofIPFS_API');

contract_address_provided = process.argv[3];

//  [network, id, account_private_key, account_public_key]
const networks = [
    ['http://localhost:4200',       111, 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3', '0x7bb3b0e8a59f3f61d9bff038f4aeb42cae2ecce8'],
    ['https://dev-api.zilliqa.com', 333, '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c', ''],
    ['https://api.zilliqa.com',       1, '', '']
];

const [network, chain_id, privateKey, account_address] = networks[0];  // grab parameter of kaya local network


describe('ProofIPFS', function() {

    describe('Connect to Zilliqa Blockchain', function() {

        it('should connect to the blockchain and get the right chain_id', async function() {
            zilliqa = new Zilliqa(network);
            const network_id = await zilliqa.network.GetNetworkId();
            const id = parseInt(network_id.result)
            expect(id).to.equal(chain_id)
        })

        it('should have the right test account', async function() {
            zilliqa.wallet.addByPrivateKey(privateKey);
            address = getAddressFromPrivateKey(privateKey).toLowerCase();
            expect(address).to.equal(account_address);
        })

        it('should have at least 10 ZIL in the account', async function () {
            const bal_obj = await zilliqa.blockchain.getBalance(address);
            const balance_BN = new BN(bal_obj.result.balance);
            const min_amount_BN = units.toQa(10, units.Units.Zil);
            const ok = balance_BN.gte(min_amount_BN);
            expect(ok).to.be.true;
        })
    })

    describe('Deploy contract', function() {

        it('should read contract source', function() {
            let ok = false;
            try {
                code = fs.readFileSync('contracts/ProofIPFS.scilla', 'utf-8');
                ok = true;
            } catch (err) {
            }
            expect(ok).to.be.true;
        })

        it('should deploy the contract', async function() {
            this.timeout(10000);
            this.slow(5000);
            const MSG_VERSION = 1;
            const VERSION = bytes.pack(chain_id, MSG_VERSION);
            const myGasPrice = units.toQa('1000', units.Units.Li);

            const init = [{
                vname: '_scilla_version',
                type: 'Uint32',
                value: '0',
            },
            {
                vname: 'owner',
                type:  'ByStr20',
                value: address,
            }];

            const contract = zilliqa.contracts.new(code, init);

            [deployTx, proof_ipfs] = await contract.deploy({
                version: VERSION,
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(15000),
            });

            expect(deployTx.txParams.receipt.success).to.be.true;
        })
    })


})