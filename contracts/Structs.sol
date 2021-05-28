pragma solidity 0.6.0;

library Structs {

  struct Flight {
    bool isRegistered;
    bytes32 flightNumber;
    uint8 statusCode;
    uint32 updatedTimestamp;        
    address airline;
  }

  // struct Insurance {
  //   address[] insurees;
  //   bytes32 flightKey;
  // }

  struct Airline {
    bytes32 name;
    bool isRegistered;
    address airlineAddress;
    uint airlineIndex;
    uint numVotes;
  }


    function toBytes32(string memory _myString) internal pure returns(bytes32)
    {
        require(bytes(_myString).length <= 32);
        bytes32 byteString;
        assembly {
            byteString := mload(add(_myString, 32))
        }
        return byteString;
    }
}
