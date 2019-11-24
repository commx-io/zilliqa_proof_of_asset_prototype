pragma solidity 0.5.11;

// Example of Storing IPFS hash with file details in struct on Ethereum.
contract Proof
   {
       struct FileDetails
       {
           uint timestamp;
           bytes32 owner;
       }

       // mapping for a IPFS file hash to FileDetails struct 
       mapping (bytes32 => FileDetails) files;
       
       //this is used to store the owner of file at the block timestamp
       function set(bytes32 owner, bytes32 fileHash, uint timestamp)
            external
       {
           // There is no proper way to check if a key already exists or not
           // therefore we are checking for default value i.e., all bits are 0
           if(files[fileHash].timestamp == 0)
           {
               files[fileHash] = FileDetails(timestamp, owner);
               // we are triggering an event so that the frontend of our app
               // knows that the file's existence and ownership details have been stored
               emit logFileAddedStatus(true, timestamp, owner, fileHash);
           }
           else {
            // this tells to the frontend that file's existence and
            // ownership details couldn't be stored because the file's details had already
            // been stored earlier
            emit logFileAddedStatus(false, timestamp, owner, fileHash);
            } 
        }

       //this is used to get file information for verification
       function get(bytes32 fileHash) public view returns (uint timestamp, bytes32 owner)
       {
           return (files[fileHash].timestamp, files[fileHash].owner);
       }

       function validateFile(bytes32 fileHash, bytes32 owner, uint timeExistsBy)
            public
            view
            returns (bool)
        {
            FileDetails memory file = files[fileHash];

            // validates owner and timestamp of file is before timestamp given
            if (file.owner == owner && file.timestamp <= timeExistsBy) {
                return true;
            }

            return false;
        }

       event logFileAddedStatus(bool status, uint timestamp, bytes32 owner, bytes32 fileHash);
}
