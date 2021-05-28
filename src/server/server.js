import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import "babel-polyfill";


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log("THIS HAPPENED", error);
    if(event){
      console.log("SUCCESSFULLY RESPONDING TO ORACLE REQUEST", event);
      // Check event indices
      // emit OracleRequest(index, airline, flight, timestamp);
      flightSuretyApp.methods.submitOracleResponse();
    }
});

flightSuretyApp.events.OracleRegistered().on('data', async (event) => {
  console.log("OracleRegistered data: ", event.returnValues);
}).on('error', (error) => console.log("An error occured", error));


flightSuretyApp.events.Toto({
  fromBlock: 0
}).on('data', async (event, error) => {
  alert('Toto was fired');
  alert(event.returnValues);
  if(error){
    console.log("TOTO ERRORED", error);
  }
}).on('error', (error) => console.log("An error occured", error));

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


