const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Ethereum Sepolia Testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You may need more ETH for deployment.");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 11155111n) {
    throw new Error("❌ Not connected to Sepolia testnet. Please check your network configuration.");
  }

  // Deploy RWA Token
  console.log("\n=== Deploying RWA Token ===");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  
  const tokenName = "RWA Token";
  const tokenSymbol = "RWA";
  const owner = deployer.address;
  const feeCollector = deployer.address; // Using deployer as fee collector for simplicity
  
  console.log("Deployment parameters:");
  console.log("- Name:", tokenName);
  console.log("- Symbol:", tokenSymbol);
  console.log("- Owner:", owner);
  console.log("- Fee Collector:", feeCollector);
  
  console.log("Deploying RWA Token...");
  const rwaToken = await RWAToken.deploy(tokenName, tokenSymbol, owner, feeCollector);
  console.log("Waiting for deployment confirmation...");
  await rwaToken.waitForDeployment();
  
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("✅ RWA Token deployed to:", rwaTokenAddress);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
  
  // Verify initial state
  console.log("\n=== RWA Token Initial State ===");
  try {
    console.log("Total Supply:", ethers.formatEther(await rwaToken.totalSupply()));
    console.log("Max Supply:", ethers.formatEther(await rwaToken.MAX_SUPPLY()));
    console.log("Decimals:", await rwaToken.decimals());
    console.log("Owner Balance:", ethers.formatEther(await rwaToken.balanceOf(owner)));
  } catch (error) {
    console.log("⚠️  Could not verify token state immediately. This is normal on testnets.");
  }

  // Deploy Staking Contract
  console.log("\n=== Deploying Multi Pool Staking ===");
  const MultiPoolStaking = await ethers.getContractFactory("MultiPoolStaking");
  
  console.log("Deploying Multi Pool Staking...");
  const stakingContract = await MultiPoolStaking.deploy();
  console.log("Waiting for deployment confirmation...");
  await stakingContract.waitForDeployment();
  
  const stakingAddress = await stakingContract.getAddress();
  console.log("✅ Multi Pool Staking deployed to:", stakingAddress);
  
  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Add initial staking pool
  console.log("\n=== Setting up Initial Staking Pool ===");
  const poolMaxStake = ethers.parseEther("1000000"); // 1M tokens
  const poolMinStake = ethers.parseEther("100"); // 100 tokens
  const rewardRate = ethers.parseEther("0.1"); // 0.1 tokens per second
  const lockPeriod = 86400; // 1 day in seconds
  
  console.log("Pool parameters:");
  console.log("- Staking Token:", rwaTokenAddress);
  console.log("- Max Stake Limit:", ethers.formatEther(poolMaxStake));
  console.log("- Min Stake Amount:", ethers.formatEther(poolMinStake));
  console.log("- Reward Rate:", ethers.formatEther(rewardRate), "tokens per second");
  console.log("- Lock Period:", lockPeriod, "seconds");
  
  try {
    console.log("Adding initial pool...");
    const addPoolTx = await stakingContract.addPool(
      rwaTokenAddress,
      poolMaxStake,
      poolMinStake,
      rewardRate,
      lockPeriod
    );
    console.log("Waiting for transaction confirmation...");
    await addPoolTx.wait();
    console.log("✅ Initial pool added successfully!");
    
    // Verify pool creation
    const poolInfo = await stakingContract.getPoolInfo(0);
    console.log("\n=== Pool 0 Information ===");
    console.log("- Staking Token:", poolInfo.stakingToken);
    console.log("- Total Staked:", ethers.formatEther(poolInfo.totalStaked));
    console.log("- Max Stake Limit:", ethers.formatEther(poolInfo.maxStakeLimit));
    console.log("- Min Stake Amount:", ethers.formatEther(poolInfo.minStakeAmount));
    console.log("- Reward Rate:", ethers.formatEther(poolInfo.rewardRate));
    console.log("- Is Active:", poolInfo.isActive);
    console.log("- Lock Period:", poolInfo.lockPeriod.toString());
  } catch (error) {
    console.log("⚠️  Could not add initial pool immediately:", error.message);
    console.log("You can add the pool manually later using the addPool function.");
  }

  // Final summary
  console.log("\n=== 🎉 Deployment Summary ===");
  console.log("Network: Ethereum Sepolia Testnet");
  console.log("Chain ID: 11155111");
  console.log("✅ RWA Token:", rwaTokenAddress);
  console.log("✅ Multi Pool Staking:", stakingAddress);
  console.log("✅ Deployer:", deployer.address);
  
  console.log("\n=== 🔗 Etherscan Links ===");
  console.log("RWA Token:", `https://sepolia.etherscan.io/address/${rwaTokenAddress}`);
  console.log("Staking Contract:", `https://sepolia.etherscan.io/address/${stakingAddress}`);
  console.log("Deployer:", `https://sepolia.etherscan.io/address/${deployer.address}`);
  
  console.log("\n=== 📋 Next Steps ===");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${rwaTokenAddress} "${tokenName}" "${tokenSymbol}" "${owner}" "${feeCollector}"`);
  console.log(`   npx hardhat verify --network sepolia ${stakingAddress}`);
  console.log("");
  console.log("2. Add liquidity to staking pool (transfer tokens to staking contract)");
  console.log("3. Test the contracts using a testnet wallet");
  console.log("4. Update your frontend with the new contract addresses");
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      rwaToken: rwaTokenAddress,
      stakingContract: stakingAddress
    },
    etherscanLinks: {
      rwaToken: `https://sepolia.etherscan.io/address/${rwaTokenAddress}`,
      stakingContract: `https://sepolia.etherscan.io/address/${stakingAddress}`,
      deployer: `https://sepolia.etherscan.io/address/${deployer.address}`
    }
  };
  
  console.log("\n=== 💾 Deployment Info ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  return deploymentInfo;
}

// Execute deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 Sepolia deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });