pragma solidity 0.6.0;

library Structs {

  struct Flight {
    bool isRegistered;
    bytes32 flightNumber;
    uint8 statusCode;
    uint32 updatedTimestamp;        
    address airline;
  }

  struct Insurance {
    address[] insurees;
    bytes32 flightKey;
  }

  struct Airline {
    bool isRegistered;
    address airlineAddress;
    uint airlineIndex;
    uint numVotes;
  }
}
