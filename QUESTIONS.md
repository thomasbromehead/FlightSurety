1. Why do we mark the App contract's `registerAirline` as pure?
I get warnings saying that it should be a `view` since the `requireIsOperational` modifier looks into the Data contract's state, and also affects it by registering an airline. 

2. Function in the Data contract are only callable via the App contract by way of registering it as an authorized caller.
3. Is it OK to create a fund pool which is a mapping 
4. What should the access modifier be when a routine acts as a proxy to the Data contract? If I call a data contract view function from the app contract should that function be a view too?
5. Cannot cannot an external function within the constructor while the contract is being constructed, so code duplication for registering the first airline?
6. I keep passing in airline as an argument from App to DataContract as the msg.sender from the Data contract's perspective will be the app contract account instead of the externally owned account, how could I get around that?
7. To fund the airline I use the contract's fallback function, if the call() returns true I call fundAirline but how can I forward the message.value?
8. ```javascript
    function registerFlight
                            (   
                                address caller,
                                address airline,
                                string calldata flightNumber
                            )
                            external
```
This function is `external` and the compiler asks me to specify `flightNumber` to be located in `calldata`
9. upgradability, proxy wallets, meta-transactions, and counterfactual deployment
