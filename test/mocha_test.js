/* eslint-env node, mocha */

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert; // require('assert');

const fs = require('fs');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {toBech32Address, getAddressFromPrivateKey} = require('@zilliqa-js/crypto');

const {ProofIPFS_API, myGasPrice} = require('../lib/ProofIPFS_API');

//    contract_address_dev = 'zil189lz6gkpwhqtma7mlq26h5fryk0n0f0xz0hvus';
const contract_address_dev = '0x397E2d22c175c0bDF7dbF815AbD123259f37A5E6';

// $ npm --network=kaya test
network_choice = process.env.npm_config_network || 'kaya';
console.log({network_choice});

const networks = {
    kaya : ['http://localhost:4200',       111, 'db11cfa086b92497c8ed5a4cc6edb3a5bfe3a640c43ffb9fc6aa0873c56f2ee3', '0x7bb3b0e8a59f3f61d9bff038f4aeb42cae2ecce8',  10000,   5000],
    dev  : ['https://dev-api.zilliqa.com', 333, '447a392d41017c14ec0a1786fc46388f63e7865ec759d07bce0a0c6e2dc41b5c', 'zil1pw587sm57lvlu0wlwkc3gw2sddy35au6esw589', 180000, 180000],
    main : ['https://api.zilliqa.com',       1, '', '', 180000, 180000]
};

network_parameter = networks[network_choice.toLowerCase()]
if (network_parameter == null)
	throw new Error("unknown blockchain network");
const [network, chain_id, privateKey, account_address, timeout_deploy, timeout_transition] = network_parameter;


describe('ProofIPFS', function() {

    describe('Connect to Zilliqa Blockchain', function() {

		it('should run on node version v10', function() {
			const node_version = process.version;
			const ok = (node_version.substring(0,4) == 'v10.');
			expect(ok).to.be.true;
		})

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
            // https://mochajs.org/#timeouts
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

    describe('Test the contract', function() {

        this.timeout(5000);
        this.slow(5000);

        it('should get the contract_api', async function() {
            contract_api = new ProofIPFS_API(proof_ipfs, chain_id);
            expect(contract_api).be.instanceOf(ProofIPFS_API);
        })

        it('should registerOwnership for item_0', async function() {
            item_0 = 'Qm00000000000000000000000000000000000000000000';
            meta_0 = "{filename : 'Qm_0.txt'}";
            const result = await contract_api.registerOwnership(item_0, meta_0);
            const ok = result.success;
            expect(ok).to.be.true;
        })

        it('should registerOwnership for item_1', async function() {
            item_1 = 'Qm11111111111111111111111111111111111111111111';
            meta_1 = "{filename : 'Qm_1.txt'}";
            const result = await contract_api.registerOwnership(item_1, meta_1);
            const ok = result.success;
            expect(ok).to.be.true;
        })

        it('should retrieve list of registered items for a given address', async function() {
            const result = await contract_api.getItemList(address);
            const expected_list = [item_0, item_1];
            const ok = (result.length == expected_list.length) && (expected_list.every(e => result.includes(e)));
            expect(ok).to.be.true;
        })

        it('should check registration information for an item', async function() {
            const result = await contract_api.getRegistration(item_0);
            const ok = (result[0] == address) && (result[2] == meta_0);
            expect(ok).to.be.true;
        })

        it('should report if item is not registered', async function() {
            item_9 = 'Qm99999999999999999999999999999999999999999999';
            const result = await contract_api.getRegistration(item_9);
            expect(result).be.empty;
        })

    })
})