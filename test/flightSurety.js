
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const TruffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {

    // TEST SETTING RETRIEVING MSG.VALUE FROM APP CONTRACT IN DATA CONTRACT
  const owner = accounts[0];
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
        await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          console.log("This happened", e);
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(data contract owner) should allow the owner to add authorized app contracts as consumers', async () => {
      try {
        let isAllowedContract = await config.flightSuretyData.isAuthorizedContract(accounts[0]);
        assert.equal(isAllowedContract, false);
        await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: accounts[0]})
        isAllowedContract = await config.flightSuretyData.isAuthorizedContract(accounts[0]);
        assert.equal(isAllowedContract, true);
      } catch(e) {
        console.log("This error was thrown", e);
      }
  })

  it('Should revert if the contract has not been authorized to call into the Data contract', async () => {
      await TruffleAssert.reverts(config.flightSuretyData.isOperational().call({from: owner}));
  })

  it('should return the data contract\'s address', async () => {
      let dataContractAddress = config.flightSuretyData.address;
      let dataContractAddressGetter = await config.flightSuretyApp.getDataContractAddress.call();
      assert.equal(dataContractAddress, dataContractAddressGetter);
  })

  it('By default an airline\'s balance should be 0', async () => {
    let firstAirlineBalance = await config.flightSuretyData.fundPool.call(config.firstAirline);
    console.log("Registered airlines", firstAirlineBalance);
    assert.equal(firstAirlineBalance, 0);
  })

  it.only('An airline should be able to fund its account', async () => {
    // Move this to a before
    await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner})
    await config.flightSuretyApp.fundAirline(config.firstAirline, {from: owner, value: web3.utils.toWei('1', 'ether')});
    let firstAirlineBalance = await config.flightSuretyData.fundPool.call(config.firstAirline);
    assert.equal(firstAirlineBalance, web3.utils.toWei('1', 'ether'));
  })

  describe('An unregistered airline should not be able to fund its pool account', async () => {

  })
});
