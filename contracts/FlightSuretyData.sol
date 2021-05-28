pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

import "./Structs.sol";

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    using Structs for Structs.Flight;
    using Structs for Structs.Airline;
    event NotOwner(address);
    event ContractAuthorized(address);
    event FundsReceived(uint);
    event FlightRegistered(string flightNumber);
    event AirlineRegistered(address airline);
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // struct Vote {
    //     address[] voters;
    //     uint numVotes;
    // }

    address public contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) public allowedContracts;
    mapping(address => Structs.Airline) public airlines;
    mapping(address => uint) public fundPool;
    mapping(address => address[]) public voters;
    mapping(bytes32 => address[]) public policies;
    mapping(address => uint256) private insureeBalances;
    Structs.Airline[] public airlinesArray;
    mapping(address => Structs.Flight[]) public flights;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirlineAddress
                                ) 
                                public
                                payable 
    {
        contractOwner = msg.sender;
        registerAirline("British Airways", firstAirlineAddress, true, msg.sender);
        if(msg.value > 0 ether){
            fundPool[firstAirlineAddress] = msg.value;
        }
    }

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
        require(operational, "Contract is currently not operational");
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
    * @dev Modifier that requires the calling account to be an airline
    * Allow contract owner as an approved airline, needed for first registration call in constructor
    */
    modifier isApprovedAirline(address airline){
        require(airlines[airline].isRegistered || contractOwner == msg.sender , "This airline has not been registered");
        _;
    }

    /**
    * @dev Modifier that checks whether an airline has already votes for another
    */
    modifier hasNotVoted(address caller, address candidateAirline) {
        require(msg.sender != candidateAirline, "Airline trying to vote for itself");
        bool alreadyVoted;
        for(uint i = 0; i < voters[candidateAirline].length; i++){
            if(voters[candidateAirline][i] == caller){
                alreadyVoted = true;
            }
        }
        require(!alreadyVoted, "You have already voted for this airline");
        _;
    }

    /**
    * @dev Modifier that requires the calling account to be an authorized contract
    */
    event ShowMe(bool);
    modifier isAuthorizedContract() {
        require(isContractAuthorized(msg.sender), "The calling contract has not been authorized to call in");
        _;
    }

    /**
    * @dev Check that flight is registered
    */
    modifier flightIsRegistered(address airline, bytes32 flightNumber){
        bool registeredFlight;
        for(uint i = 0; i < flights[airline].length; i++){
            if(flights[airline][i].flightNumber == flightNumber){
                registeredFlight = flights[airline][i].isRegistered;
            }
        }
        require(registeredFlight, "You cannot buy insurance for a flight that's not registered");
        _;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */  

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            // isAuthorizedContract()
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Returns number of airlines registered
    *
    */      
    function numberOfRegisteredAirlines() 
                            public
                            view 
                            // isAuthorizedContract()
                            returns(uint) 
    {
        // You have to initialize it straight away
        Structs.Airline[] memory registeredAirlines = new Structs.Airline[](airlinesArray.length);
        uint counter = 0;
        for(uint i = 0; i < airlinesArray.length; i++){
            if(airlinesArray[i].isRegistered){
                registeredAirlines[counter] = airlinesArray[i];
                counter++;
            }
        }
        return registeredAirlines.length;
    }

    /**
    * @dev Return policies dynamic arrays, possible thanks to the experimental encoder
    */   
    function getPolicies(bytes32 flightNumber) external view returns(address[] memory){
        return policies[flightNumber];
    }

    // For testing
    function getPoliciesString(string calldata flightNumber) external view returns(address[] memory){
        bytes32 flightNumberAsBytes = Structs.toBytes32(flightNumber);
        return policies[flightNumberAsBytes];
    }

    /**
    * @dev Return voters dynamic arrays, possible thanks to the experimental encoder
    */   
    function getVoters(address airline) external view returns(address[] memory){
        return voters[airline];
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /**
    * @dev Add contracts that can call in
    */   
    function registerContract
                            (   
                                address allowedContract
                            )
                            requireIsOperational()
                            requireContractOwner()
                            external
                            payable
                            returns(bool)
    {
        allowedContracts[allowedContract] = true;
        assert(allowedContracts[allowedContract] == true);
        emit ContractAuthorized(allowedContract);
        return true;
    }

    /**
    * @dev Register Flight
    */   
    function registerFlight
                            (   
                                address caller,
                                address airline,
                                string calldata flightNumber
                            )
                            isAuthorizedContract()
                            isApprovedAirline(caller)
                            isApprovedAirline(airline)
                            external
                            payable
    {
        bytes32 flightNumberAsBytes = Structs.toBytes32(flightNumber);
        Structs.Flight memory flight = Structs.Flight(true, flightNumberAsBytes, 0, uint32(block.timestamp), airline);
        flights[airline].push(flight);
        emit FlightRegistered(flightNumber);
    }

    /**
    * @dev Add contracts that can call in
    *      
    *
    */   
    function isContractAuthorized
                            (   
                                address contractAddress
                            )
                            requireIsOperational()
                            public
                            view
                            returns(bool)
    {
        // ALLOW CONTRACT TO CALL ITSELF (FOR REGISTERING THE FIRST AIRLINE)
        if(msg.sender == contractOwner){ return true; }
        return allowedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
   
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function fetchAirlineBuffer
                            (
                                address airlineArg
                            )
                            external
                            view
        returns
        (
            bool isRegistered,
            address airlineAddress,
            uint index,
            uint numberOfVotes
        )
    {
     Structs.Airline storage airline = airlines[airlineArg];
     return(
        airline.isRegistered,
        airline.airlineAddress,
        airline.airlineIndex,
        airline.numVotes
     );
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                bytes32 airlineName,
                                address airline,
                                bool registered,
                                address caller
                            )
                            isAuthorizedContract()
                            isApprovedAirline(caller)
                            // isFunded(airline) CALLED IN APP CONTRACT
                            public
                            payable
                            returns(bool)
    {
        require(caller != airline, "An airline cannot register itself");
        uint index = airlinesArray.length.add(1);
        Structs.Airline memory airlineStruct = Structs.Airline({
            name: airlineName,
            isRegistered: registered,
            airlineAddress: airline,
            airlineIndex: index,
            numVotes: 0
        });
        airlines[airline] = airlineStruct;
        airlinesArray.push(airlineStruct);
        emit AirlineRegistered(airline);
        return true;
    }

    function setRegistered(address airline) public {
        airlines[airline].isRegistered = true;
    }

    /**
    * @dev Fund the airline
    *
    */   
    function fundAirline
                        (
                         address airline,
                         uint value
                        )
                        isAuthorizedContract()
                        // isApprovedAirline(msg.sender)
                        isApprovedAirline(airline)
                        external 
                        payable
    {
        fundPool[airline] = value;
    }

    /**
    * @dev Show the airline's balance
    *
    */  
    function getAirlineBalance(address airline) external view returns(uint){
        return fundPool[airline];
    }

    /**
    * @dev Vote for an airline
    *
    */ 
    event NumVotes(uint votes);

    function voteForAirline
                            (
                                address airline,
                                address caller
                            )
                            external 
                            isAuthorizedContract()
                            isApprovedAirline(caller)
                            hasNotVoted(caller, airline)
    {
        require(caller != airline, "An airline cannot vote for itself");
        emit NumVotes(airlines[airline].numVotes);
        airlines[airline].numVotes = (airlines[airline].numVotes).add(1);
        // Register vote for candidate airline
        voters[airline].push(caller);
        // Require > 50% of airlines to have voted to toggle isRegistered to true
        if(voters[airline].length >= uint(numberOfRegisteredAirlines() / 2)){
            airlines[airline].isRegistered = true;
        }
    }

    /**
    * @dev Get the number of votes this airline has received
    *
    */ 
    function getVotes(
                        address airline
                    ) 
                    isAuthorizedContract()
                    external 
                    view
                    returns(uint votes)
    {
        return airlines[airline].numVotes;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance
                            (       
                                address airline, 
                                bytes32 flightNumber,
                                address caller
                            )
                            isAuthorizedContract()
                            flightIsRegistered(airline, flightNumber)
                            external
                            payable
                            returns(bool)
    {
        // bytes32 flightNumberAsBytes = Structs.toBytes32(flightNumber);
        address[] storage policy = policies[flightNumber];
        insureeBalances[airline] = msg.value;
        policy.push(caller);
        return true;
    }

   /**
    * @dev Get list of registered flights
    */  
    function getRegisteredFlights(address airline) public view returns(bytes32[] memory)
    {
        bytes32[] memory registeredFlightNumbers = new bytes32[](flights[airline].length);
        for(uint i = 0; i < flights[airline].length; i++){
            registeredFlightNumbers[i] = flights[airline][i].flightNumber;
        } 
        return registeredFlightNumbers;
    }


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightNumber
                                )
                                isAuthorizedContract()
                                external
                                view
    {
        // Loop over insurees for this flight
        // insureeBalances[holder] = 0;
        // payable(address(holder)).transfer();
        // 1)Get balance of the passenger previous to the transaction
        // 2) Get gasUsed by the transaction and multiply it by the gas price, to get the amount of WEI consumed in the transaction
        // 3) Get balance of the passenger after the transaction
        // 4) Check that this is valid:
        // previousBalance < gasUsedWEI + afterBalance
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            isAuthorizedContract()
                            external
                            view
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    // function fund
    //                         (   
    //                         )
    //                         isAuthorizedContract()
    //                         public
    //                         payable
    // {
    // }

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

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback() 
                            external 
                            payable 
    {
        require(msg.data.length == 0, "This function is only meant to receive Ether");
        uint value = uint(msg.value);
        emit FundsReceived(value);
    }

    receive() 
                            external 
                            payable
    {

    }
}

