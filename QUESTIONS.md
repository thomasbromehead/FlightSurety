1. Why do we mark the App contract's `registerAirline` as pure?
I get warnings saying that it should be a `view` since the `requireIsOperational` modifier looks into the Data contract's state, and also affects it by registering an airline. 