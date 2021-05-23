var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

module.exports = {
  networks: {
    dev: {
      provider: function() {
        var wallet = new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
        var nonceTracker = new NonceTrackerSubprovider()
        wallet.engine._providers.unshift(nonceTracker)
        nonceTracker.setEngine(wallet.engine)
        return wallet
      },
      network_id: '*',
      gas: 5500000,
      gasPrice: 21000000000,
    }
  },
  compilers: {
    solc: {
      version: "0.6.0",
      parser: "solcjs",
      docker: true
    }
  }
};