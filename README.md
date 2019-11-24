# Zilliqa blockchain : Proof of Asset

Concept of 'proof of existence' to prove ownership and existence of a file. IPFS will be used as file storage and to ensure file integrity.

Once a file is stored on IPFS, the Content IDentifier (CID) = hash of the file can be registred by a user with his Zilliqa address to prove ownership and existence at or before a particular block/time.


## supported functionality / contract interface

The following transitions shall be available within the Scilla contract


### setOwnership (ipfs_cid : String)
Allows (only) the sender to register an IPFS CID for an item (stored on IPFS) with his Zilliqa addess.
More information on IPFS Content Identifier (CID) can be found here:

[https://github.com/multiformats/cid](https://github.com/multiformats/cid)

[https://github.com/multiformats/multibase](https://github.com/multiformats/multibase)


`_sender` is used internally as the address
At the same time the blocknumber is stored with the transaction which allows to retrieve the timestamp for this ownership registration
If the given IPFS CID is already registered, it will not registred again. This will ensure that the blocknumber from the initial registration will be kept unchanged.

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3
let code_item_exist     = Uint32 4
```


### checkRegistered (ipfs_cid : String)
Return the owner address and block_number of registration for a given IPFS CID. Using the block_number a time_stamp can be requested from the Zilliqa blockchain.

possible return codes:
```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_invalid_params = Uint32 3 (invalid CID format)
```


### getRegistration (ipfs_cid : String)
Check if a IPFS CID/hash has been registered already.

possible return codes:
```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_invalid_params = Uint32 3 (invalid CID format)
```


### getOwner (ipfs_cid : String) => owner : ByStr20 *** not implemented yet ***
Return the owner address for a given IPFS CID.

possible return codes:
```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_invalid_params = Uint32 3 (invalid CID format)
```


### deleteOwnership (ipfs_cid : String)
Delete / unregister ownership of given IPFS CID.
Only owner (registered address) of item is allowed to execute this transitions

possible return codes:

```
let code_success        = Uint32 0
let code_item_not_found = Uint32 1
let code_not_authorized = Uint32 2
let code_invalid_params = Uint32 3
```


### getItems (owner : ByStr20) => item_list : List(ipfs_cid : String)
Return a list of IPFS CID which have been registered ownership with a given owner address.

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3 (invalid address / not found)
```

## Testnet contract
contract address: zil1jfs6gfuu2w3hlhp55xaklckava4r2k5d8xy72z
