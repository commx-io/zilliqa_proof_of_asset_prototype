# Zilliqa blockchain : Proof of Asset

Concept of 'proof of existence' to prove ownership and existence of a file. IPFS will be used as file storage and to ensure file integrity.

Once a file is stored on IPFS, the Content IDentifier (CID) = hash of the file can be registred by a user with his Zilliqa address to prove ownership and existence at or before a particular block/time.



---------------------------------------------------------------------------
## supported functionality / contract interface

The following transitions shall be available within the Scilla contract

---------------------------------------------------------------------------
### registerOwnership (ipfs_cid : String, metadata: String)
Allows (only) the sender to register an IPFS CID (hash) for an item (stored on IPFS) with his Zilliqa address.
Metadata can be provided along with the registration. If a JSON string is used, the number and names of parameters can be flexibly adapted to the application and registered items.
More information on IPFS Content Identifier (CID) can be found here:

[https://github.com/multiformats/cid](https://github.com/multiformats/cid)

[https://github.com/multiformats/multibase](https://github.com/multiformats/multibase)

`_sender` account address is used internally for the registration.
At the same time, the blocknumber is stored with the transaction which allows to later retrieve the timestamp for this ownership registration
If the given IPFS CID is already registered, it will not be registered again. This will ensure that the blocknumber from the initial registration will be kept unchanged and nobody else can claim ownership as well.

The contract owner can define a price for each registration.
The user who wants to register a IPFS file has to send the exact amount
with the transition. The transition will be rejected if the amount was too high or too low.

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3
let code_item_exist     = Uint32 4
let code_amount_wrong   = Uint32 5
```
---------------------------------------------------------------------------
### getRegistration (ipfs_cid : String)
Check if a IPFS CID/hash has been registered already.
Returns `account_address, block_number, metadata` if exist.

```
params:[] 2 items
	0:{} 3 keys
	vname:"code"
	type:"Uint32"
	value:"0"
	1:{} 3 keys
	vname:"msg"
	type:"RegData"
	value:{} 3 keys
		constructor:"RegData"
		argtypes:[] 0 items
		arguments:[] 3 items
			0:"0x17c755c09529755785978241e2db021eb4dbf569"
			1:"4473"
			2:"name=ironore001"
```

possible return codes:
```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_invalid_params = Uint32 3 (invalid CID format)
```
---------------------------------------------------------------------------
### deleteRegistration (ipfs_cid : String)
Delete / unregister ownership of given IPFS CID.
Only registered account address of item is allowed to delete.

possible return codes:

```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_not_authorized = Uint32 2
let code_invalid_params = Uint32 3
```
---------------------------------------------------------------------------
### transition setPrice (new_price : Uint128) [only owner]
Allows the owner of the contract so set a price for a registration.
The price has to be specified in "Qa". 10^12 Qa = 1 ZIL.
```
let code_success        = Uint32 0
let code_not_authorized = Uint32 2
```
---------------------------------------------------------------------------
### transition getPrice ()
Get price to register a IPFS file. The amount is in "Qa". 10^12 Qa = 1 ZIL.
```
no error code returned
```
---------------------------------------------------------------------------
### transition getBalance () [only owner]
Get balance of contract. The amount is in "Qa". 10^12 Qa = 1 ZIL.
```
let code_success        = Uint32 0
let code_not_authorized = Uint32 2
```
---------------------------------------------------------------------------
### transition getFunds () [only owner]
Transfer funds of contract to owner.
```
let code_success        = Uint32 0
let code_not_authorized = Uint32 2
```
---------------------------------------------------------------------------
### getItemList (account : ByStr20) => item_list : List(ipfs_cid : String)
Return a list of items (IPFS CIDs) which have registered ownership with a given account address.

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3 (invalid address / not found)
```

---------------------------------------------------------------------------
## Return / Error Codes Library
```
let code_success            = Uint32 0
let code_item_not_found     = Uint32 1
let code_not_authorized     = Uint32 2
let code_invalid_params     = Uint32 3
let code_already_registered = Uint32 4
let code_amount_wrong       = Uint32 5

let code_cannot_get_funds   = Uint32 11
```
---------------------------------------------------------------------------
## Testnet contract
see [Releases](../../releases) 
