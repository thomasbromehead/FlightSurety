
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const TruffleAssert = require('truffle-assertions');
const firstAirlineName = "British Airways";
const secondAirlineName = "Air France";
const thirdAirlineName = "Alitalia";
const fourthAirlineName = "Royal Air Maroc";
const fifthAirlineName = "TAP";
const sixthAirlineName = "Sabena";


contract('Flight Surety Tests - isOperational', async (accounts) => {

    // TEST SETTING RETRIEVING MSG.VALUE FROM APP CONTRACT IN DATA CONTRACT
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
})

contract('Flight Surety Tests - Contract Authorization', async (accounts) => {
    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    it('(data contract owner) should allow the owner to add authorized app contracts as consumers', async () => {
        try {
          let isAllowedContract = await config.flightSuretyData.isContractAuthorized(accounts[0]);
          assert.equal(isAllowedContract, false);
          await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: accounts[0]})
          isAllowedContract = await config.flightSuretyData.isContractAuthorized(accounts[0]);
          assert.equal(isAllowedContract, true);
        } catch(e) {
          console.log("This error was thrown", e);
        }
    })
  
    it('Should revert if the contract has not been authorized to call into the Data contract', async () => {
        await TruffleAssert.reverts(config.flightSuretyData.registerFlight(config.firstAirline, config.firstAirline, "UI987", {from: config.firstAirline}));
    })                           
  
    it('should return the data contract\'s address', async () => {
        let dataContractAddress = config.flightSuretyData.address;
        let dataContractAddressGetter = await config.flightSuretyApp.getDataContractAddress.call();
        assert.equal(dataContractAddress, dataContractAddressGetter);
    })
})


contract('Flight Surety Tests - Airline Registration ', async (accounts) => {
    const owner = accounts[0];
    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(firstAirlineName, newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.airlines(newAirline); 

    // ASSERT
    assert.equal(result.isRegistered, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('Number of registered airlines should increment gradually', async () => {
    let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
    TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
    let numberOfRegisteredAirlinesOnInitialization = await config.flightSuretyData.numberOfRegisteredAirlines.call();
    assert.equal(numberOfRegisteredAirlinesOnInitialization, 1);
    await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline);
    let numberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
    assert.equal(numberOfRegisteredAirlines, 2);
    await config.flightSuretyApp.fundAirline(config.secondAirline, {from: config.secondAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.registerAirline(thirdAirlineName, config.thirdAirline, config.secondAirline);
    let newNumberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
    assert.equal(newNumberOfRegisteredAirlines, 3);
  })

  it('An airline\'s index should increment as new airlines are registered', async () => {
    let airline1Info = await config.flightSuretyData.fetchAirlineBuffer(config.firstAirline);
    let airline2Info = await config.flightSuretyData.fetchAirlineBuffer(config.secondAirline);
    assert.equal(airline1Info[2], 1);
    assert.equal(airline2Info[2], 2);
  })

  it('The first four airlines should have a status of isRegistered set to true', async () => {
    await config.flightSuretyApp.registerAirline(fourthAirlineName, config.fourthAirline, config.firstAirline);
    let airline1Info = await config.flightSuretyData.fetchAirlineBuffer(config.firstAirline);
    let airline2Info = await config.flightSuretyData.fetchAirlineBuffer(config.secondAirline);
    let airline3Info = await config.flightSuretyData.fetchAirlineBuffer(config.thirdAirline);
    let airline4Info = await config.flightSuretyData.fetchAirlineBuffer(config.fourthAirline);
    assert.equal(airline1Info[0], true);
    assert.equal(airline2Info[0], true);
    assert.equal(airline3Info[0], true);
    assert.equal(airline4Info[0], true);
})

  it('From fifth airline registration, multiparty consensus is needed', async () => {
      let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
      TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
      await config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(thirdAirlineName, config.thirdAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(fourthAirlineName, config.fourthAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(fifthAirlineName, config.fifthAirline, config.firstAirline);
      let registrationTx = await config.flightSuretyApp.registerAirline(sixthAirlineName, config.sixthAirline, config.firstAirline);
      TruffleAssert.eventEmitted(registrationTx, "VotesNeeded");
      // Sixth airline should not be registered
      let airlineInfo = await config.flightSuretyData.fetchAirlineBuffer(config.sixthAirline);
      assert.equal(airlineInfo[0], false);
  })
})

contract('Flight Surety Tests - Airline Funding ', async (accounts) => {
  var config;
  const owner = accounts[0];

  before('setup contract', async () => {
      config = await Test.Config(accounts);
      // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it('By default an airline\'s balance should be 0', async () => {
      let firstAirlineBalance = await config.flightSuretyData.fundPool.call(config.firstAirline);
      console.log("Registered airlines", firstAirlineBalance);
      assert.equal(firstAirlineBalance, 0);
  })

  it('(airline) An airline cannot fund the data Contract unless registered', async () => {
      await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
      // First four don't need to be voted in 
      await config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(thirdAirlineName, config.thirdAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(fourthAirlineName, config.fourthAirline, config.firstAirline);
      // Fifth airline is not registered by default
      await TruffleAssert.reverts(config.flightSuretyApp.fundAirline(config.fifthAirline, {from: config.fifthAirline, value: web3.utils.toWei('10', 'ether')}));
  })

  it('An airline should be able to fund its account', async () => {
    // Move this to a before
    await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
    await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
    let firstAirlineBalance = await config.flightSuretyData.fundPool.call(config.firstAirline);
    assert.equal(firstAirlineBalance, web3.utils.toWei('10', 'ether'));
  })
})

contract('Flight Surety Tests - Votes ', async (accounts) => {
  var config;
  const owner = accounts[0];

  before('setup contract', async () => {
      config = await Test.Config(accounts);
      // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it('(airline) Should be impossible to vote for another airline if airline hasn\'t commited at least 10 ether', async () => {
      await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
      await TruffleAssert.reverts(config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline));
  })
            
  it('Returns the number of votes an airline has received', async () => {
      let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
      // TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
      await config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline);
      await config.flightSuretyApp.fundAirline(config.secondAirline, {from: config.secondAirline, value: web3.utils.toWei('10', 'ether')});
      await config.flightSuretyApp.registerAirline(thirdAirlineName, config.thirdAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(fourthAirlineName, config.fourthAirline, config.firstAirline);
      await config.flightSuretyApp.registerAirline(fifthAirlineName, config.fifthAirline, config.firstAirline);
      await config.flightSuretyApp.voteForAirline(config.fifthAirline, {from: config.firstAirline});
      let fifthAirlineInfo = await config.flightSuretyData.fetchAirlineBuffer(config.fifthAirline);
      assert.equal(fifthAirlineInfo[3], 1);
      await config.flightSuretyApp.voteForAirline(config.fifthAirline, {from: config.secondAirline});
      let fifthAirlineInfoAfterSecondVote = await config.flightSuretyData.fetchAirlineBuffer(config.fifthAirline);
      assert.equal(fifthAirlineInfoAfterSecondVote[3], 2);
  })

  it('(airline) should be impossible to vote twice for the same airline', async () => {
    await TruffleAssert.reverts(config.flightSuretyApp.voteForAirline(config.fifthAirline, {from: config.firstAirline}), "You have already voted for this airline.");        
  });
})

contract('Flight Surety Tests - Consensus is needed', async (accounts) => {
  var config;
  const owner = accounts[0];

  before('setup contract', async () => {
      config = await Test.Config(accounts);
      // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it('(airline) More than half of the airlines need to have voted for an airline for it to become registered', async () => {
    let authorizeContractTx = await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
    TruffleAssert.eventEmitted(authorizeContractTx, "ContractAuthorized");
    await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.registerAirline(secondAirlineName, config.secondAirline, config.firstAirline);
    await config.flightSuretyApp.fundAirline(config.secondAirline, {from: config.secondAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.registerAirline(thirdAirlineName, config.thirdAirline, config.firstAirline);
    await config.flightSuretyApp.registerAirline(fourthAirlineName, config.fourthAirline, config.firstAirline);
    // First four airlines are registered
    await config.flightSuretyApp.registerAirline(fifthAirlineName, config.fifthAirline, config.firstAirline);
    // At least 2 airlines need to have voted
    await config.flightSuretyApp.voteForAirline(config.fifthAirline, {from: config.firstAirline});
    let fifthAirlineInfo = await config.flightSuretyData.fetchAirlineBuffer(config.fifthAirline);
    console.log("FIFTH AIRLINE: ", fifthAirlineInfo);
    assert.equal(fifthAirlineInfo[0], false);
    let voteTx = await config.flightSuretyApp.voteForAirline(config.fifthAirline, {from: config.secondAirline});
    TruffleAssert.eventEmitted(voteTx, "VoteCast");
    let fifthAirlineInfoAfterVote = await config.flightSuretyData.fetchAirlineBuffer(config.fifthAirline);
    assert.equal(fifthAirlineInfoAfterVote[0], true);
  })
})

contract('Flight Surety Tests - Insurance Purchase ', async (accounts) => {
  var config;
  const owner = accounts[0];
  const flightNumber = "UJ234";

  before('setup contract', async () => {
      config = await Test.Config(accounts);
      // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it('A passenger can purchase insurance for a registered flight', async () => {
      await config.flightSuretyData.registerContract(config.flightSuretyApp.address, {from: owner});
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: web3.utils.toWei('20', 'ether')});
      await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, {from: config.firstAirline});
      // For some reason this event never gets caught...
      // TruffleAssert.eventEmitted(registerFlightTx, "FlightRegistered");
      let registeredFlights = await config.flightSuretyData.getRegisteredFlights(config.firstAirline);
      assert.equal(registeredFlights.length, 1);
      let insurancePurchaseTx = await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNumber, {from: accounts[8], value: web3.utils.toWei('1', 'ether')});
      TruffleAssert.eventEmitted(insurancePurchaseTx, "InsurancePurchased");
      await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNumber, {from: accounts[9], value: web3.utils.toWei('0.5', 'ether')});
      let policyHolders = await config.flightSuretyData.getPoliciesString(flightNumber);
      assert.equal(policyHolders[0], accounts[8]);
      assert.equal(policyHolders[1], accounts[9]);
      assert.equal(policyHolders.length, 2);
  })

  it('A passenger cannot purchase insurance for a non-registered flight', async () => {
      TruffleAssert.reverts(config.flightSuretyApp.buyInsurance(config.firstAirline, flightNumber, {from: accounts[8]}), "You cannot buy insurance for a flight that's not registered.");
  })

  it('A passenger cannot purchase insurance for more than 1 ether', async () => {
    TruffleAssert.reverts(config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, {from: config.firstAirline, value: web3.utils.toWei('1.5', 'ether') }), "Insurance costs at most 1 ether");
  })

  it('A passenger cannot purchase insurance if he doesn\'t call the function without funds', async () => {
    TruffleAssert.reverts(config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, {from: config.firstAirline}), "This function is expecting a payment");
  })
});


// WRITE TESTS FOR ORACLES
// 1. TEST THAT FLIGHT STATUS REVERTS IF THERE ARE NO REGISTERED FLIGHTS
