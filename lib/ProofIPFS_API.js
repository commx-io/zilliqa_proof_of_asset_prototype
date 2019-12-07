/* eslint-env node, browser */
// ***eslint-env node, mocha

'use strict';

const { BN, Long, bytes, units } = require('@zilliqa-js/util');

const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions 

// const chain_id = 111; // TODO - this only works for local network

const MSG_VERSION = 1;
// const VERSION = bytes.pack(chain_id, MSG_VERSION);



class ProofIPFS_API {

	static TEST = '123';
	static TEST = 'abc';

	constructor(deployed_contract, chain_id) {
		this.proof_ipfs = deployed_contract;
		this.kaya = false;
		this.VERSION = bytes.pack(chain_id, MSG_VERSION);

		// amount, gasPrice and gasLimit must be explicitly provided
		this.params_default = {
			version: this.VERSION,
			amount: new BN(0),
			gasPrice: myGasPrice,
			gasLimit: Long.fromNumber(8000),
		}
	}
	
	// we need to know if we are running on kaya localhost blockchain to fix kaya errors
	setKaya(flag){
		this.kaya = flag;
	}

	getKaya() {
		return this.kaya;
	}

    /*** Function implementing contract interfaces ***/
	// get state information from blockchain node - faster than contract transition */
	// https://github.com/Zilliqa/Zilliqa-JavaScript-Library/blob/dev/examples/queryState.js

    // we need this workaround until getSubState is working on kaya local network
    async contract_getSubState(selector_not_used) {
        const full_state = await this.proof_ipfs.getState();
        return full_state;
    }

    async getPrice() {
        let substate = await this.contract_getSubState('price');
        return (substate ? parseInt(substate.price) : 0);
    }

    async getBalance() {
        let state = await this.contract_getSubState('_balance');
        return (state ? parseInt(state._balance) : 0);
    }

    async getRegistration(ipfs_cid) {
		let reg_info = [];
		if (!this.kaya) {
			// this is for the real Zilliqa test and main blockchain
        	let state = await this.proof_ipfs('ipfsInventory', [ipfs_cid]);
			reg_info = (state ? state.ipfsInventory[ipfs_cid].arguments : []);
		} else {
			// workaround to get it to work on kaya local network
			const full_state = await this.proof_ipfs.getState();
			const item = full_state.ipfsInventory.find(o => o.key == ipfs_cid);
			reg_info = (item ? item.val.arguments : []);
		}
        return reg_info;
    }

    async getItemList(one_address) {
		let a = one_address.toLowerCase();
		let item_list = [];
		if (!this.kaya) {
			// this is for the real Zilliqa test and main blockchain
			const state = await this.proof_ipfs.getSubState('registered_items', [a]);
			item_list = (state ? state.registered_items[a] : []);
		} else {
			// workaround to get it to work on kaya local network
			const full_state = await this.proof_ipfs.getState();
			const ri = full_state.registered_items;
			const reg_info = ri.find(o => o.key == a);
			item_list = (reg_info ? reg_info.val : [])
		}
		return item_list
    }

    async getPrice_fromContract() {
        const callTxGet = await this.proof_ipfs.call('getPrice', [], this.params_default);
        const receipt_get = callTxGet.txParams.receipt;
        const p = receipt_get.event_logs[0].params;
        return (p[0]['value'] ? parseInt(p[0]['value']) : 0);
    }

    async setPrice(new_price) {
        const callTx = await this.proof_ipfs.call('setPrice',
            [{
                vname: 'new_price',
                type : 'Uint128',
                value: new_price.toString(),
            }],
            this.params_default
        );
        return callTx // .txParams.receipt;
    }

    async registerOwnership(ipfs_cid, metadata) {
        const price  = await getPrice();
        console.log({price});
        let params_register = this.params_default;
        params_register.amount = new BN(price);
        console.log({params_register})
        const callTx = await this.proof_ipfs.call('registerOwnership',
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


}
module.exports = {ProofIPFS_API, myGasPrice};
//ES6
// export {ProofIPFS_API, myGasPrice};
