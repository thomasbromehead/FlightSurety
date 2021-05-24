pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        bool isRegistered;
        address airlineAddress;
        uint airlineIndex;
        uint numVotes;
    }

    // struct Vote {
    //     address[] voters;
    //     uint numVotes;
    // }

    address public contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) public allowedContracts;
    mapping(address => Airline) public airlines;
    mapping(address => uint) public fundPool;
    mapping(address => address[]) public voters;
    Airline[] public airlinesArray;

    event NotOwner(address);
    event ContractAuthorized(address);
    event FundsReceived(uint);

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
        registerAirline(firstAirlineAddress, true, msg.sender);
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
    modifier hasNotVoted(address candidateAirline) {
        assert(msg.sender != candidateAirline);
        bool alreadyVoted;
        for(uint i = 0; i < voters[candidateAirline].length; i++){
            if(voters[candidateAirline][i] == msg.sender){
                alreadyVoted = true;
            }
        }
        require(!alreadyVoted, "You have already voted for this airline");
        _;
    }



    /**
    * @dev Modifier that requires the calling account to be an authorized contract
    */
    modifier isAuthorizedContract() {
        require(isContractAuthorized(msg.sender), "The calling contract has not been authorized to call in");
        _;
    }

    /**
    * @dev Check that an airline isn't yet registered (for votes)
    */

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

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
                            external
                            view 
                            // isAuthorizedContract()
                            returns(uint) 
    {
        // You have to initialize it straight away
        Airline[] memory registeredAirlines = new Airline[](airlinesArray.length);
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
    *      
    *
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
     Airline storage airline = airlines[airlineArg];
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
        uint index = airlinesArray.length.add(1);
        Airline memory airlineStruct = Airline({
            isRegistered: registered,
            airlineAddress: airline,
            airlineIndex: index,
            numVotes: 0
        });
        airlines[airline] = airlineStruct;
        airlinesArray.push(airlineStruct);
        airlinesArray.length.add(1);
        return true;
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
    function voteForAirline
                            (
                                address airline,
                                address caller
                            )
                            external 
                            isAuthorizedContract()
                            isApprovedAirline(airline)
                            hasNotVoted(caller)
    {
        airlines[airline].numVotes.add(1);
        voters[airline].push(caller);
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
    function buy
                            (                             
                            )
                            isAuthorizedContract()
                            external
                            payable
                            
    {
        
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                isAuthorizedContract()
                                external
                                view
    {
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

