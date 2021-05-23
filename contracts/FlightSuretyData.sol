pragma solidity 0.6.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        bool isRegistered;
        address airlineAddress;
    }


    address public contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) public allowedContracts;
    mapping(address => Airline) public registeredAirlines;
    mapping(address => uint) public fundPool;
    // Airline[] private registeredAirlinesArray;

    event NotOwner(address);

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
        Airline memory firstAirline = Airline({isRegistered: true, airlineAddress: firstAirlineAddress});
        registeredAirlines[firstAirlineAddress] = firstAirline;
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
    */
    modifier isAirline(address airline){
        require(registeredAirlines[airline].isRegistered, "This airline has not been registered");
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
    * @dev Modifier that requires the calling account to be an airline
    */
    modifier isFunded(address airline) {
        require(fundPool[airline] >= 10 ether, "Airline's balance is less than 10 ether");
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
    function isOperational() 
                            public 
                            view 
                            // isAuthorizedContract()
                            returns(bool) 
    {
        return operational;
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
    function registerAirline
                            (   
                                address airline
                            )
                            isAuthorizedContract()
                            isAirline(airline)
                            isFunded(airline)
                            external
                            payable
    {
        Airline memory airlineStruct = Airline({isRegistered: true, airlineAddress: airline});
        registeredAirlines[airline] = airlineStruct;
    }

    /**
    * @dev Buy insurance for a flight
    *
    */   
    function fundAirline
                        (
                         address airline   
                        )
                        isAuthorizedContract()
                        isAirline(airline)
                        external 
                        payable
    {
        fundPool[airline] = msg.value;
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
    function fund
                            (   
                            )
                            isAuthorizedContract()
                            public
                            payable
    {
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

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback() 
                            external 
                            payable 
    {
        fund();
    }
}

