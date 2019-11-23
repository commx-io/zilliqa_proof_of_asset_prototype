# Ziliqa blockchain : Proof of Asset

Concept of 'proof of existence' to prove ownership and existence of a file. IPFS will be used as file storage and to ensure file integrity.

Once a file is stored on IPFS, the Content IDentifier (CID) = hash of the file can be registred by a user with his Zilliqa address to prove ownership and existence at or before a particular block/time.


## supported functionality / contract interface

The following transitions shall be available within the Scilla contract

### SetOwnership (ipfs_cid : String)
allows (only) the sender to register an IPFS CID for an item (stored on IPFS) with his Zilliqa addess.
More information on IPFS Content Identifier (CID) can be found here:

(https://github.com/multiformats/cid)[https://github.com/multiformats/cid]
(https://github.com/multiformats/multibase)[https://github.com/multiformats/multibase]


`_sender` is used internally as the address
At the same time the blocknumber is stored with the transaction which allows to retrieve the timestamp for this ownership registration
If the given IPFS CID is already registered, it will not registred again. This will ensure that the blocknumber from the initial registration will be kept unchanged.

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3
let code_item_exist     = Uint32 4
```

### GetOwner (ipfs_cid : String) => owner : ByStr20
return the owner address for a given IPFS CID

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3 (invalid CID format)
let code_item_not_exist = Uint32 4 (IPFS CID was not found)
```

### DeleteOwnership (ipfs_cid : String)
Delete / unregister ownership of given IPFS CID
Only owner of items is allowed to execute this transitions

possible return codes:

```
let code_success        = Uint32 0
let code_not_authorized = Uint32 2
let code_invalid_params = Uint32 3
let code_item_not_exist = Uint32 4 (IPFS CID was not found)
```

### GetItems (owner : ByStr20) => item_list : List(ipfs_cid : String)
return a list of IPFS addresses (hash) which have been registered ownership with a given address

possible return codes:
```
let code_success        = Uint32 0
let code_invalid_params = Uint32 3 (invalid address)
let code_item_not_exist = Uint32 4 (address was not found)
```
