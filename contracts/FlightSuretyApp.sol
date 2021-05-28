pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;
    uint8 private constant MAX_INSURANCE_PRICE = 1;
    uint8 private constant REGISTERED_AIRLINE_THRESHOLD = 4;

    // Account used to deploy contract
    address public contractOwner;          

    FlightSuretyData private dataContract;

    event VotesNeeded(address airline);
    event FundsReceived(address, uint);
    event VoteCast(address voter);
    event InsurancePurchased(bytes32 flightNumber, address insuree);

 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        bool dataContractOperational = isOperational();
        require(true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the calling account to be an airline. There is a business rule here (10 ETH limit)
    * so belongs here in my opinion.
    */
    modifier isFunded(address airline) {
        uint balance = dataContract.getAirlineBalance(airline);
        require(balance >= 10 ether, "Airline's balance is less than 10 ether");
        _;
    }

    modifier hasNotBoughtInsurance(bytes32 flightNumber) {
        bool hasBought;
        address[] memory policies = dataContract.getPolicies(flightNumber);
        for(uint i = 0; i < policies.length; i++){
            if(policies[i] == msg.sender){ 
                hasBought = true;
            }
        }
        require(!hasBought, "You already bought an insurance for this flight");
        _;
    }

    modifier registerIfEnoughVotes(address airline) {
        _;
        address[] memory voters = dataContract.getVoters(airline);
        if(voters.length >= uint(dataContract.numberOfRegisteredAirlines() / 2)){
            dataContract.setRegistered(airline);
        }
        emit VoteCast(msg.sender);
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address dataContractAddress
                                ) 
                                public
    {
        contractOwner = msg.sender;
        dataContract = FlightSuretyData(payable(dataContractAddress));
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return dataContract.isOperational();  // Modify to call data contract's status
    }

    function getDataContractAddress() public view returns(address){
        return address(dataContract);
    }

    function getDataContractBalance() public view returns(uint){
        address(dataContract).balance;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
   /**
    * @dev Vote for an airline
    *
    */ 
    function voteForAirline
                          (
                              address airline
                          )
                          requireIsOperational()
                          isFunded(msg.sender)
                          registerIfEnoughVotes(airline)
                          external
    {
        dataContract.voteForAirline(airline, msg.sender);
    }
   /**
    * @dev Add an airline to the registration queue
    *
    */
    function registerAirline
                            (
                                string calldata name,
                                address airline,
                                address caller  
                            )
                            requireIsOperational()
                            isFunded(caller)
                            external
                            payable
                            returns(bool success, uint256 votes)
    {
        bool isSuccess;
        uint totalRegisteredAirlines = dataContract.numberOfRegisteredAirlines();
        bytes32 airlineName = Structs.toBytes32(name);
        if(totalRegisteredAirlines >= REGISTERED_AIRLINE_THRESHOLD){
            // require multisig
            emit VotesNeeded(airline);
            isSuccess = dataContract.registerAirline(airlineName, airline, false, caller);
        } else {
            isSuccess = dataContract.registerAirline(airlineName, airline, true, caller);
        }
        return(isSuccess, 0);
    }

    function fundAirline
                        (
                            address airline
                        )
                        requireIsOperational()
                        external
                        payable
                        returns(bool)
    {
        (bool success, ) = address(dataContract).call.value(msg.value)("");
        require(success, "An error happened while funding the Data Contract");
        dataContract.fundAirline(airline, msg.value);
        emit FundsReceived(airline, msg.value);
        return success;
    }

    function buyInsurance(address airline, string calldata flightNumber) external payable
    // hasNotBoughtInsurance(flightNumber)
    {
        require(msg.value > 0, "This function is expecting a payment");
        require(msg.value <=  1 ether, "Insurance costs at most 1 ether");
        // Fund contract
        // (bool success, ) = address(dataContract).call.value(msg.value)("");
        // require(success, "Failed to buy insurance");
        bytes32 flightNumberAsBytes = Structs.toBytes32(flightNumber);
        // Apply logic
        bool success2 = dataContract.buyInsurance.value(msg.value)(airline, flightNumberAsBytes, msg.sender);
        require(success2, "Failed to register insuree");
        emit InsurancePurchased(flightNumberAsBytes, msg.sender);
    }

    function getAirlineBalance
                        (
                            address airline
                        )
                        requireIsOperational()
                        external
                        view
                        returns(uint)
    {
        dataContract.getAirlineBalance(airline);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    address airline,
                                    string calldata flightNumber
                                )
                                requireIsOperational()
                                isFunded(msg.sender)
                                external
    {
        require(msg.sender == airline, "You can't register a flight for another airline");
        dataContract.registerFlight(msg.sender, airline, flightNumber);
        // emit Structs.FlightRegistered(flightNumber);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                requireIsOperational()
                                internal
                                view
    {
    }

    event Toto(string name);

    function toto() external {
        emit Toto("toto was fired");
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string calldata flight,
                            uint256 timestamp                            
                        )
                        requireIsOperational()
                        external
    {
        bytes32[] memory registeredFlights = dataContract.getRegisteredFlights(airline);
        require(registeredFlights.length > 0, "There are no registered flights available");
        bool flightIsRegistered;
        bytes32 flightNumberAsBytes = Structs.toBytes32(flight);
        for(uint i = 0; i < registeredFlights.length; i++){
            if(registeredFlights[i] == flightNumberAsBytes){
                flightIsRegistered = true;
            }
        }
        assert(flightIsRegistered);
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });
        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);
    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);
    event OracleRegistered();

    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
        emit OracleRegistered();
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3] memory indices)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string calldata flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory indices)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }
        return random;
    }

// endregion

}   
