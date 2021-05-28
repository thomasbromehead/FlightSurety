import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        console.log("WEB3 SET IN CONSTRUCTOR IS", this.web3);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress)
        this.initialize(callback);
        this.owner = null;
        this.airlines = {};
        this.passengers = [];
    }

    initialize(callback) {
        (async () => { 
            let accounts = await this.web3.eth.getAccounts();
            this.owner = accounts[0];
            let counter = 1;
            document.getElementById("appContractAddress").value = this.flightSuretyApp._address;
            const airlineNames = ["British Airways", "Air France", "Alitalia", "Royal Air Maroc", "TAP", "Sabena"];
            for(let i = 0; i < 5; i++ ){
                this.airlines[airlineNames[i].toString()] = accounts[counter++];
            }
            while(this.passengers.length < 5) {
                this.passengers.push(accounts[counter++]);
            }
            callback();
        })();
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

    authorizeContract(address, caller){
        let self = this;
        try {
            self.flightSuretyData.methods
            .registerContract(address)
            .send({from: caller, value: web3.utils.toWei('1', 'ether')}).catch(err => alert(`This happenned ${err}`))
        } catch (error) {
            alert(`This happened ${error}`);
        }
    }

    isContractAuthorized(address, caller){
        let self = this;
        try {
            self.flightSuretyData.methods
            .isContractAuthorized(address)
            .send({from: caller}).catch(err => alert(`This happenned ${err}`))
        } catch (error) {
            alert(`This happened ${error}`);
        }
    }

    fundAccount(airlineAddress, caller, callback){
        let localReceipt;
        let self = this;
        self.flightSuretyApp.methods
        .fundAirline(airlineAddress)
        .send({from: caller}).then(receipt => {
            alert(`Receipt: ${localReceipt}`);
            localReceipt = receipt;
        });
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
        console.log("REGISTERING ORACLES");
        self.flightSuretyApp.methods
        .registerOracle()
        .send({from: caller, value: web3.utils.toWei('1', 'ether')}, callback);
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