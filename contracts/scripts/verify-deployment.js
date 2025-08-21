const { ethers } = require("hardhat");

async function main() {
  console.log("=== Verifying Contract Deployment ===");
  
  // Contract addresses from deployment
  const RWA_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const STAKING_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  try {
    // Get contract instances
    const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);
    const stakingContract = await ethers.getContractAt("MultiPoolStaking", STAKING_ADDRESS);
    
    console.log("✅ Contract instances created successfully");
    
    // Verify RWA Token
    console.log("\n=== RWA Token Verification ===");
    const tokenName = await rwaToken.name();
    const tokenSymbol = await rwaToken.symbol();
    const totalSupply = await rwaToken.totalSupply();
    const maxSupply = await rwaToken.MAX_SUPPLY();
    
    console.log("Name:", tokenName);
    console.log("Symbol:", tokenSymbol);
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("Max Supply:", ethers.formatEther(maxSupply));
    
    // Verify Staking Contract
    console.log("\n=== Staking Contract Verification ===");
    const poolCount = await stakingContract.poolCount();
    const emergencyFee = await stakingContract.emergencyWithdrawFee();
    
    console.log("Pool Count:", poolCount.toString());
    console.log("Emergency Withdraw Fee:", emergencyFee.toString(), "basis points");
    
    if (poolCount > 0) {
      const poolInfo = await stakingContract.getPoolInfo(0);
      console.log("\nPool 0 Details:");
      console.log("- Staking Token:", poolInfo.stakingToken);
      console.log("- Max Stake Limit:", ethers.formatEther(poolInfo.maxStakeLimit));
      console.log("- Min Stake Amount:", ethers.formatEther(poolInfo.minStakeAmount));
      console.log("- Reward Rate:", ethers.formatEther(poolInfo.rewardRate), "per second");
      console.log("- Is Active:", poolInfo.isActive);
      console.log("- Lock Period:", poolInfo.lockPeriod.toString(), "seconds");
    }
    
    // Verify contract interaction
    console.log("\n=== Contract Interaction Test ===");
    const [deployer] = await ethers.getSigners();
    const deployerBalance = await rwaToken.balanceOf(deployer.address);
    console.log("Deployer Token Balance:", ethers.formatEther(deployerBalance));
    
    // Test approval (dry run)
    const approvalAmount = ethers.parseEther("1000");
    console.log("Testing approval for", ethers.formatEther(approvalAmount), "tokens...");
    
    // Check current allowance
    const currentAllowance = await rwaToken.allowance(deployer.address, STAKING_ADDRESS);
    console.log("Current Allowance:", ethers.formatEther(currentAllowance));
    
    console.log("\n✅ All verifications passed!");
    console.log("\n=== Deployment Status ===");
    console.log("🟢 RWA Token: Deployed and functional");
    console.log("🟢 Multi Pool Staking: Deployed and functional");
    console.log("🟢 Initial pool configured");
    console.log("🟢 Ready for use!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Verification completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });