import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import Web3 from "web3";
import oracleProviders from "../../oracleProviders.json";
import flightSuretyApp from "../../build/contracts/FlightSuretyApp.json";

const App = {
    web3Provider: null,
    metamaskAccount: null,
    appContract: null,
    dataContract: null,
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
        console.log("PROVIDERS", providers);
        for(let i = 0; i <= 20; i++){
            App.appContract.registerOracle((error, result) => {
                if(error){ console.log(error) }
                if(result){ console.log(result) }
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
        console.log("WEB3", web3);
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
        addressInput.value = App.appContract.airlines["British Airways"];
    },
    setDefaultContractAddress: function(){
        App.appContract.flightSuretyApp.address
    },
    handleButtonClick: async function(event) {
        event.preventDefault();
        var processId = parseInt(event.target.dataset.id);
        let airlineName = document.getElementById("airline-name-registration").value;
        let airlineAddress = document.getElementById("airlineAddress").value;
        let contractAddress = document.getElementById("appContractAddress").value;
        switch(processId) {
            case 1:
                try {
                    return await App.dataContract.authorizeContract(contractAddress, App.metamaskAccountID, (error, res) => { 
                        if(error) alert(error);
                        if(res) alert(res);
                    });
                } catch (error) {
                    alert(error);
                    return
                }
                break;
            case 2:
                try {
                    return await App.dataContract.isContractAuthorized(contractAddress, App.metamaskAccountID);
                    // console.log(tx);
                } catch (error) {
                    alert(error)
                }
            case 3:
                // MAKE SURE THE PERSON IS LOGGED IN WITH THE RIGHT ACCOUNT OR IS CONTRACT OWNER
                let callerCheck = this.checkAccountCorresponds(airlineName);
                if(callerCheck) {
                    try {
                        return await App.appContract.registerAirline(airlineName, airlineAddress, App.metamaskAccountID, (error, res) => { 
                            if(error) alert(error);
                            if(res) console.log(tx);
                        });
                    } catch (error) {
                        alert(error);
                        return
                    }
                }
                return "Incorrect calling account,  make sure you are either the owner or the airline trying to register";
            case 3:
                return await App.appContract.fundAccount(airlineAddress, App.metamaskAccountID);
            case 19:
                console.log("here");
                let flightNumber = document.getElementById("flight-dropdown").value;
                console.log("Flight Number: ", flightNumber);
                let airline = document.getElementById("airline-dropdown").value;
                console.log("AIRLINE", airline);
                return await App.appContract.fetchFlightStatus(airline, flightNumber, () => { });
                break;
        }
    },
    checkAccountCorresponds: function(name){
        return (App.appContract.airlines[name] == App.metamaskAccountID || App.metamaskAccountID == App.appContract.owner);
    },
    setAccounts: function(){
        this.accounts[App.appContract.owner] = "Contract Owner";
        for(let i = 0; i < App.appContract.passengers.length; i++){
            this.accounts[App.appContract.passengers[i]] = `Passenger ${i}`
        }
        let airlineEntries = Object.entries(App.appContract.airlines);
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
        addressInput.value = App.appContract.airlines[dropdown.value];
    })

    if (window.ethereum) {
        App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
                console.log("enabled window.ethereum");
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
    

    web3 = new Web3(App.web3Provider)
    
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
    App.appContract = new Contract('localhost', () => {   
        App.setAccounts(); 
        // Read transaction
        App.appContract.isOperational((error, result) => {
            console.log(error,result);
            App.display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        App.setDefaultAirlineAddress();
    
        // User-submitted transaction
        // DOM.elid('submit-oracle').addEventListener('click', () => {
        //     let flight = DOM.elid('flight-number').value;
        //     // Write transaction
        //     App.contract.fetchFlightStatus(flight, (error, result) => {
        //         App.display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        //     });
        // });
    });
    App.dataContract = new Contract('localhost', () => {

    });

    App.setAccounts().then( res => {
        // alert(res);
        App.setActiveUser();
    });

    App.bindEvents();
    App.registerOracles();
});

    
    








