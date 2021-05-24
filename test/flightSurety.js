
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

  it('An airline\'s index should increment as new airlines are registered', async () => {
    await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
  })

  it('An airline should be able to fund its account', async () => {
    // Move this to a before
    await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner})
    await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
    let firstAirlineBalance = await config.flightSuretyData.fundPool.call(config.firstAirline);
    assert.equal(firstAirlineBalance, web3.utils.toWei('10', 'ether'));
  })

    describe('votes', () => {
        // CANNOT USE A BEFORE HOOK, IT JUST HANGS..., MAYBE IT SHOULDN'T BE ASYNC...
        // before(async _ => {
        //     // await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
        //     // await config.flightSuretyApp.fundAirline(config.firstAirline, {from: owner, value: web3.utils.toWei('10', 'ether')});
        // })

        it.only('From fifth airline registration, multiparty consensus is needed', async () => {
            let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
            TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
            await flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
            await flightSuretyApp.registerAirline(config.secondAirline, config.firstAirline);
            // await config.flightSuretyApp.registerAirline(config.thirdAirline, {from: config.firstAirline});
            // await config.flightSuretyApp.registerAirline(config.fourthAirline, {from: config.firstAirline});
            // await config.flightSuretyApp.registerAirline(config.fifthAirline, {from: config.firstAirline});
            // let registrationTx = config.flightSuretyApp.registerAirline(sixthAirline, {from: config.firstAirline});
            // TruffleAssert.eventEmitted(registrationTx, "VotesNeeded");
        })

        it('(airline) Should be impossible to vote for another airline if you haven\'t commited at least 10 ether', async () => {
            await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
            await TruffleAssert.reverts(config.flightSuretyApp.registerAirline(config.secondAirline, config.firstAirline));
        })
        
    
        it('An approved and funded airline can vote for another', async () => {

        })
            
        it('Returns the number of votes an airline has received', async () => {

        })

        it('(airline) ')
    })

    it('Should credit the airline\'s balance if ether is sent to the constructor', async () => {

    })

    it.only('Number of registered airlines should increment gradually', async () => {
        let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
        TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
        let numberOfRegisteredAirlinesOnInitialization = await config.flightSuretyData.numberOfRegisteredAirlines.call();
        console.log("The first airline should be registered by default");
        assert.equal(numberOfRegisteredAirlinesOnInitialization, 1);
        await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
        await config.flightSuretyApp.registerAirline(config.secondAirline, config.firstAirline, {from: config.firstAirline});
        let numberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
        assert.equal(numberOfRegisteredAirlines, 2);
        await config.flightSuretyApp.fundAirline(config.secondAirline, {from: config.secondAirline, value: web3.utils.toWei('10', 'ether')});
        await config.flightSuretyApp.registerAirline(config.thirdAirline, config.secondAirline, {from: config.firstAirline});
        let newNumberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
        assert.equal(newNumberOfRegisteredAirlines, 3);
    })

    it('Should get an airline\'s balance', async () => {
        let balance = await config.flightSuretyApp.getAirlineBalance(config.firstAirline);
        console.log("BALANCE", balance);
        assert.equal(balance, web3.utils.toWei('0', 'ether'));
    })

    it('(airline) should be impossible to vote twice for the same airline', async () => {

    });

    it('should return an airline\'s properties', async () => {
        // Test fetchAirlineBuffer
    });

});
