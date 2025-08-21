const { ethers } = require("hardhat");

async function main() {
  console.log("=== Deploying Multi Pool Staking ===");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  const MultiPoolStaking = await ethers.getContractFactory("MultiPoolStaking");
  const stakingContract = await MultiPoolStaking.deploy();
  await stakingContract.waitForDeployment();
  
  const stakingAddress = await stakingContract.getAddress();
  console.log("\n✅ Multi Pool Staking deployed to:", stakingAddress);
  
  // Verify deployment
  console.log("\n=== Verification ===");
  console.log("Pool Count:", await stakingContract.poolCount());
  console.log("Emergency Withdraw Fee:", await stakingContract.emergencyWithdrawFee());
  console.log("Owner:", await stakingContract.owner());
  
  return stakingAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Multi Pool Staking deployment completed!");
    console.log("Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });