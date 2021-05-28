import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        debugger;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = {};
        this.passengers = [];
    }

    initialize(callback) {
        console.log('Initialize');
        this.web3.eth.getAccounts((error, accts) => {
            debugger;
            console.log("Accounts are", accts);
            this.owner = accts[0];
            let counter = 1;
            const airlineNames = ["British Airways", "Air France", "Alitalia", "Royal Air Maroc", "TAP", "Sabena"];
            for(let i = 0; i < 5; i++ ){
                this.airlines[airlineNames[i].toString()] = accts[counter++];
            }
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    toto(callback){
        let self = this;
        self.flightSuretyApp.methods
        .toto()
        .call({from: self.owner}, callback)
    }

    fundAccount(airlineAddress, caller, callback){
        let localReceipt;
        let self = this;
        self.flightSuretyApp.methods
        .fundAirline(airlineAddress)
        .send({from: caller}).then(receipt => localReceipt = receipt);
        return localReceipt;
    }

    registerAirline(name, airlineAddress, caller, callback){
        let self = this;
        let localReceipt;
        self.flightSuretyApp.methods
        .registerAirline(name, airlineAddress, caller)
        .send({from: caller, value: web3.utils.toWei('1', 'ether')}, callback).then(receipt => localReceipt = receipt);
    }

    registerOracle(callback, caller){
        let self = this;
        console.log(caller);
        console.log("Registering oracles");
        self.flightSuretyApp.methods
        .registerOracle()
        .send({from: self.owner, value: web3.utils.toWei('2', 'ether')}, callback)
    }

    fetchFlightStatus(airline, flight, callback) {
        let self = this;
        let payload = {
            airline: this.airlines[airline],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        window.airlines = this.airlines;
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
                if(result){
                    console.log("FETCH FLIGHT STATUS RETURNED", result);
                }
                if(error){
                    alert(error);
                }
            });
    }
}