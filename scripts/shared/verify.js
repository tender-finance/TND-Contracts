const { run } = require("hardhat")

async function verify(contract, args) {
  try {
    console.log("Verifying contract...");
    await run("verify:verify", {
      address: contract.address,
      constructorArguments: args,
    });
  } catch (err) {
    if (err.message.includes("Reason: Already Verified")) {
      console.log("Contract is already verified!");
    }
    else {
      console.log(err)
    }
  }
}

module.exports = { verify }
