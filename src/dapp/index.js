import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import Web3 from "web3";
import oracleProviders from "../../oracleProviders.json";
import flightSuretyApp from "../../build/contracts/FlightSuretyApp.json";

const App = {
    web3Provider: null,
    metamaskAccount: null,
    contract: null,
    accounts: {},
    display: async (title, description, results) => {
        let displayDiv = DOM.elid("display-wrapper");
        let section = DOM.section();
        section.appendChild(DOM.h2(title));
        section.appendChild(DOM.h5(description));
        results.map((result) => {
            let row = section.appendChild(DOM.div({className:'row'}));
            row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
            row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
            section.appendChild(row);
        })
        displayDiv.append(section);
    },
    registerOracles: () => {
        let providers = oracleProviders.thirdPartyServices;
        for(let i = 0; i <= 20; i++){
            App.contract.registerOracle((error, result) => {
            }, providers[i]);
        }
    },
    setActiveUser: () => {
        web3.eth.getAccounts(function(err, res) {
            if (err) {
                console.log('Error:', err);
                return;
            }
            console.log('getMetamaskID:', res);
            App.metamaskAccountID = res[0];
            let accountName = App.accounts[App.metamaskAccountID];
            document.getElementById("user").innerText = App.metamaskAccountID;
            document.getElementById("accountAlias").innerText = accountName;
        });
    },
    bindEvents: function() {
        const actionButtons = Array.from(document.querySelectorAll("[data-id]"));
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                web3.eth.getAccounts(function(err, res) {
                    if (err) {
                        console.log('Error:', err);
                        return;
                    }
                    console.log('getMetamaskID:', res);
                    App.metamaskAccountID = res[0];
                })
                App.handleButtonClick(e);
            });
        })
    },
    setDefaultAirlineAddress: function() {
        let addressInput = document.getElementById("airlineAddress")
        addressInput.value = App.contract.airlines["British Airways"];
    },
    setDefaultContractAddress: function(){
        debugger;
        App.contract.flightSuretyApp.address
    },
    handleButtonClick: async function(event) {
        event.preventDefault();
        var processId = parseInt(event.target.dataset.id);
        let airlineName = document.getElementById("airline-name-registration").value;
        let airlineAddress = document.getElementById("airlineAddress").value;
        switch(processId) {
            case 1:
                // return await App.addRole(event);
                break;
            case 2:
                // MAKE SURE THE PERSON IS LOGGED IN WITH THE RIGHT ACCOUNT OR IS CONTRACT OWNER
                let callerCheck = this.checkAccountCorresponds(airlineName);
                if(callerCheck) {
                    try {
                        return await App.contract.registerAirline(airlineName, airlineAddress, App.metamaskAccountID, (error, res) => { 
                            if(error) alert(error);
                            if(res) console.log(tx)
                        });
                    } catch (error) {
                        alert(error);
                        return
                    }
                }
                return "Incorrect calling account,  make sure you are either the owner or the airline trying to register";
            case 3:
                return await App.contract.fundAccount(airlineAddress, App.metamaskAccountID);
            case 19:
                console.log("here");
                let flightNumber = document.getElementById("flight-dropdown").value;
                console.log("Flight Number: ", flightNumber);
                let airline = document.getElementById("airline-dropdown").value;
                console.log("AIRLINE", airline);
                return await App.contract.fetchFlightStatus(airline, flightNumber, () => { });
                break;
        }
    },
    checkAccountCorresponds: function(name){
        return (App.contract.airlines[name] == App.metamaskAccountID || App.metamaskAccountID == App.contract.owner);
    },
    setAccounts: function(){
        this.accounts[App.contract.owner] = "Contract Owner";
        for(let i = 0; i < App.contract.passengers.length; i++){
            this.accounts[App.contract.passengers[i]] = `Passenger ${i}`
        }
        let airlineEntries = Object.entries(App.contract.airlines);
        for(const airline of airlineEntries){
            this.accounts[airline[1]] = airline[0];
        }
        return Promise.resolve("Accounts set");
    }
}

window.App = App;

window.addEventListener('load', async () => {
    let dropdown = document.getElementById("airline-name-registration");
    let addressInput = document.getElementById("airlineAddress")
    dropdown.addEventListener('change', () => {
        addressInput.value = App.contract.airlines[dropdown.value];
    })

    if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
            // Request account access
            await window.ethereum.enable();
        } catch (error) {
            // User denied account access...
            console.error("User denied account access")
        }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
        App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    
    // Add event listeners
    window.ethereum.on('accountsChanged', () => { 
        // Set active user
        App.setActiveUser();
    });
    window.ethereum.on('OracleRegistered', () => {
        console.log('A new Oracle has been registered');
    })

    window.ethereum.on('accountsChanged', () => {
        alert("Changed account");
        document.getElementById("user").innerText = App.metamaskAccount
    })

    let result = null;
    App.contract = new Contract('localhost', () => {   
        App.setAccounts(); 
        // Read transaction
        App.contract.isOperational((error, result) => {
            console.log(error,result);
            App.display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        App.setDefaultAirlineAddress();
        App.setDefaultAppContractAddress();
        App.contract.toto((error, result) => {
            if(error){
                console.log("TOTO ERRORED", error);
            }
            if(result){
                console.log("RESULT FROM TOTO", result);
            }
            // console.log(error,result);
            // App.display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        // User-submitted transaction
        // DOM.elid('submit-oracle').addEventListener('click', () => {
        //     let flight = DOM.elid('flight-number').value;
        //     // Write transaction
        //     App.contract.fetchFlightStatus(flight, (error, result) => {
        //         App.display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        //     });
        // });
    });
    App.setAccounts().then( res => {
        // alert(res);
        App.setActiveUser();
    });
    App.bindEvents();
    App.registerOracles();
});

    
    








