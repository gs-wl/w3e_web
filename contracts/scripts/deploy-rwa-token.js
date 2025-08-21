const { ethers } = require("hardhat");

async function main() {
  console.log("=== Deploying RWA Token ===");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  const RWAToken = await ethers.getContractFactory("RWAToken");
  
  const tokenName = "RWA Token";
  const tokenSymbol = "RWA";
  const owner = deployer.address;
  const feeCollector = deployer.address;
  
  console.log("\nDeployment parameters:");
  console.log("- Name:", tokenName);
  console.log("- Symbol:", tokenSymbol);
  console.log("- Owner:", owner);
  console.log("- Fee Collector:", feeCollector);
  
  const rwaToken = await RWAToken.deploy(tokenName, tokenSymbol, owner, feeCollector);
  await rwaToken.waitForDeployment();
  
  const tokenAddress = await rwaToken.getAddress();
  console.log("\n✅ RWA Token deployed to:", tokenAddress);
  
  // Verify deployment
  console.log("\n=== Verification ===");
  console.log("Name:", await rwaToken.name());
  console.log("Symbol:", await rwaToken.symbol());
  console.log("Decimals:", await rwaToken.decimals());
  console.log("Total Supply:", ethers.formatEther(await rwaToken.totalSupply()));
  console.log("Max Supply:", ethers.formatEther(await rwaToken.MAX_SUPPLY()));
  console.log("Owner Balance:", ethers.formatEther(await rwaToken.balanceOf(owner)));
  
  return tokenAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 RWA Token deployment completed!");
    console.log("Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });