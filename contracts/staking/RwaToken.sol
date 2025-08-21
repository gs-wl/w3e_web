// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title RWAToken
 * @dev Professional ERC20 token contract for Real World Asset tokenization
 * 
 * Features:
 * - Standard ERC20 functionality
 * - Pausable transfers for emergency situations
 * - Burnable tokens for deflationary mechanics
 * - Owner-controlled minting with supply cap
 * - Blacklist functionality for compliance
 * - Transfer restrictions for regulatory compliance
 * - Fee exemption whitelist for DAO governance and internal operations
 * - Voting functionality with automatic checkpoints for governance
 * - Comprehensive event logging
 * - Gas-optimized operations
 * 
 * Security Features:
 * - Reentrancy protection
 * - Overflow protection
 * - Access control via Ownable
 * - Emergency pause functionality
 * - Blacklist for suspicious addresses
 * 
 * Voting Features:
 * - Automatic checkpoint creation on token transfers
 * - Historical voting power tracking for governance
 * - Gas-efficient past votes retrieval
 * - EIP-712 compliant vote delegation support
 */
contract RWAToken is ERC20, ERC20Pausable, ERC20Burnable, ERC20Votes, Ownable, ReentrancyGuard {

    // Token configuration
    uint8 private constant DECIMALS = 18;
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**DECIMALS; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**DECIMALS; // 100 million tokens
    
    // Minting configuration
    uint256 public mintingCap = 10_000_000 * 10**DECIMALS; // 10 million tokens per mint
    uint256 public lastMintTime;
    uint256 public constant MINT_COOLDOWN = 30 days;
    
    // Compliance and security
    mapping(address => bool) public blacklisted;
    mapping(address => bool) public authorizedMinters;
    mapping(address => uint256) public lastTransferTime;
    mapping(address => bool) public feeExempt; // Addresses exempt from transfer fees
    
    // Transfer restrictions
    bool public transferRestrictionsEnabled = false;
    uint256 public minTransferDelay = 0; // Minimum time between transfers
    uint256 public maxTransferAmount = MAX_SUPPLY; // Maximum transfer amount
    
    // Fee configuration
    uint256 public transferFee = 0; // Transfer fee in basis points (100 = 1%)
    uint256 public constant MAX_TRANSFER_FEE = 500; // Maximum 5% transfer fee
    address public feeCollector;
    
    // Events
    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Blacklisted(address indexed account, bool status);
    event AuthorizedMinter(address indexed minter, bool status);
    event TransferRestrictionsUpdated(bool enabled, uint256 minDelay, uint256 maxAmount);
    event TransferFeeUpdated(uint256 newFee, address newCollector);
    event MintingCapUpdated(uint256 newCap);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to);
    event FeeExemptionUpdated(address indexed account, bool status);
    
    // Custom errors for gas optimization and consistency
    error BlacklistedAddress(address account);
    error TransferAmountExceedsLimit(uint256 amount, uint256 limit);
    error TransferTooSoon(uint256 timeRemaining);
    error MintingCapExceeded(uint256 requested, uint256 available);
    error MintingCooldownActive(uint256 timeRemaining);
    error InvalidFeeAmount(uint256 fee, uint256 maxFee);
    error UnauthorizedMinter(address minter);
    error SupplyCapExceeded(uint256 requested, uint256 available);
    error ZeroAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error TransferFailed();
    error ArrayLengthMismatch();
    error TooManyRecipients();
    error TooManyAccounts();
    error CannotBlacklistOwner();
    error InsufficientETHBalance();
    error ETHTransferFailed();
    error TokenTransferFailed();
    error ExceedsAllowance();
    error InsufficientBalanceForTransferAndFee();
    error ContractPaused();
    // Note: Snapshot-related errors removed as ERC20Votes uses checkpoint system
    
    /**
     * @dev Constructor that sets up the token with initial configuration
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _owner Initial owner of the contract
     * @param _feeCollector Address to collect transfer fees
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _feeCollector
    ) ERC20(_name, _symbol) EIP712(_name, "1") Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_feeCollector == address(0)) revert ZeroAddress();
        
        feeCollector = _feeCollector;
        lastMintTime = block.timestamp;
        
        // Mint initial supply to owner
        _mint(_owner, INITIAL_SUPPLY);
        
        // Set owner as authorized minter and fee exempt
        authorizedMinters[_owner] = true;
        feeExempt[_owner] = true;
        emit AuthorizedMinter(_owner, true);
        emit FeeExemptionUpdated(_owner, true);
    }
    
    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Mints new tokens to specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        if (!authorizedMinters[msg.sender]) {
            revert UnauthorizedMinter(msg.sender);
        }
        
        // Cache storage reads for gas optimization
        uint256 cachedLastMintTime = lastMintTime;
        uint256 cachedMintingCap = mintingCap;
        
        if (block.timestamp < cachedLastMintTime + MINT_COOLDOWN) {
            revert MintingCooldownActive((cachedLastMintTime + MINT_COOLDOWN) - block.timestamp);
        }
        
        if (amount > cachedMintingCap) {
            revert MintingCapExceeded(amount, cachedMintingCap);
        }
        
        uint256 currentSupply = totalSupply();
        if (currentSupply + amount > MAX_SUPPLY) {
            revert SupplyCapExceeded(amount, MAX_SUPPLY - currentSupply);
        }
        
        lastMintTime = block.timestamp;
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }
    
    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each address
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external nonReentrant {
        if (!authorizedMinters[msg.sender]) {
            revert UnauthorizedMinter(msg.sender);
        }
        
        uint256 recipientsLength = recipients.length;
        if (recipientsLength != amounts.length) revert ArrayLengthMismatch();
        if (recipientsLength > 100) revert TooManyRecipients();
        
        // Cache storage reads for gas optimization
        uint256 cachedLastMintTime = lastMintTime;
        uint256 cachedMintingCap = mintingCap;
        
        // Validate all recipient addresses and calculate total amount in single loop
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < recipientsLength;) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            totalAmount += amounts[i];
            unchecked { ++i; }
        }
        
        if (block.timestamp < cachedLastMintTime + MINT_COOLDOWN) {
            revert MintingCooldownActive((cachedLastMintTime + MINT_COOLDOWN) - block.timestamp);
        }
        
        if (totalAmount > cachedMintingCap) {
            revert MintingCapExceeded(totalAmount, cachedMintingCap);
        }
        
        uint256 currentSupply = totalSupply();
        if (currentSupply + totalAmount > MAX_SUPPLY) {
            revert SupplyCapExceeded(totalAmount, MAX_SUPPLY - currentSupply);
        }
        
        // Update lastMintTime only after all validations pass
        lastMintTime = block.timestamp;
        
        // Mint tokens directly to recipients
        for (uint256 i = 0; i < recipientsLength;) {
            _mint(recipients[i], amounts[i]);
            emit Mint(recipients[i], amounts[i], msg.sender);
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Transfers tokens with fee calculation and restrictions
     * Note: This override maintains compatibility with ERC20Votes by using _transfer() internally,
     * which properly triggers the _update() function that handles voting power updates.
     * 
     * Reentrancy Safety: This function is safe from reentrancy attacks because:
     * 1. It only uses internal _transfer() calls which don't invoke external contracts
     * 2. All state changes happen atomically within OpenZeppelin's secure _transfer implementation
     * 3. No external calls are made that could allow reentrant execution
     */
    function transfer(address to, uint256 amount) public override nonReentrant returns (bool) {
        // Cache storage reads for gas optimization
        uint256 cachedTransferFee = transferFee;
        
        // Use consistent fee exemption logic: check both sender (msg.sender) and recipient (to)
        if (cachedTransferFee > 0 && !feeExempt[msg.sender] && !feeExempt[to]) {
            // Calculate fee with minimum fee protection for small transfers
            uint256 fee = (amount * cachedTransferFee) / 10000;
            if (fee == 0 && cachedTransferFee > 0) {
                fee = 1; // Minimum fee of 1 wei
            }
            uint256 totalRequired = amount + fee;
            
            // Check sender has sufficient balance for transfer + fee
            if (balanceOf(msg.sender) < totalRequired) revert InsufficientBalanceForTransferAndFee();
            _checkTransferRestrictions(msg.sender, to, totalRequired);
            
            // Use _transfer() to ensure ERC20Votes delegation hooks are properly called
            _transfer(msg.sender, feeCollector, fee);
            _transfer(msg.sender, to, amount);
        } else {
            _checkTransferRestrictions(msg.sender, to, amount);
            // Use _transfer() to ensure ERC20Votes delegation hooks are properly called
            _transfer(msg.sender, to, amount);
        }
        
        return true;
    }
    
    /**
     * @dev Transfers tokens from one address to another with fee calculation
     * Note: This override maintains compatibility with ERC20Votes by using _transfer() and _approve() internally,
     * which properly triggers the _update() function that handles voting power updates.
     * 
     * Reentrancy Safety: This function is safe from reentrancy attacks because:
     * 1. It only uses internal _transfer() and _approve() calls which don't invoke external contracts
     * 2. All state changes happen atomically within OpenZeppelin's secure implementations
     * 3. No external calls are made that could allow reentrant execution
     */
    function transferFrom(address from, address to, uint256 amount) public override nonReentrant returns (bool) {
        uint256 currentAllowance = allowance(from, msg.sender);
        
        // Cache storage reads for gas optimization
        uint256 cachedTransferFee = transferFee;
        
        if (cachedTransferFee > 0 && !feeExempt[from] && !feeExempt[to]) {
            // Calculate fee with minimum fee protection for small transfers
            uint256 fee = (amount * cachedTransferFee) / 10000;
            if (fee == 0 && cachedTransferFee > 0) {
                fee = 1; // Minimum fee of 1 wei
            }
            uint256 totalRequired = amount + fee;
            
            // Require allowance only for transfer amount (holder pays fee separately)
            if (currentAllowance < amount) revert ExceedsAllowance();
            // Check sender has sufficient balance for transfer + fee
            if (balanceOf(from) < totalRequired) revert InsufficientBalanceForTransferAndFee();
            _checkTransferRestrictions(from, to, totalRequired);
            
            // Transfer fee directly from holder (no allowance needed for fee)
            _transfer(from, feeCollector, fee);
            // Spend allowance and transfer amount
            _spendAllowance(from, msg.sender, amount);
            _transfer(from, to, amount);
        } else {
            if (currentAllowance < amount) revert ExceedsAllowance();
            _checkTransferRestrictions(from, to, amount);
            // Spend allowance and transfer
            _spendAllowance(from, msg.sender, amount);
            _transfer(from, to, amount);
        }
        
        return true;
    }
    
    /**
     * @dev Override _update function for OpenZeppelin v5.x compatibility
     * Handles multiple inheritance including ERC20Votes, ERC20Pausable, and blacklist checks
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable, ERC20Votes) {
        // Check if contract is paused (ERC20Pausable protection)
        if (paused()) revert ContractPaused();
        
        // Check blacklist for both sender and receiver (except for minting/burning)
        if (from != address(0) && blacklisted[from]) {
            revert BlacklistedAddress(from);
        }
        if (to != address(0) && blacklisted[to]) {
            revert BlacklistedAddress(to);
        }
        
        super._update(from, to, amount);
    }
    
    /**
     * @dev Internal function to check transfer restrictions
     */
    function _checkTransferRestrictions(
        address from,
        address to,
        uint256 amount
    ) internal {
        // Skip checks for minting and burning
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        // Check blacklist
        if (blacklisted[from]) {
            revert BlacklistedAddress(from);
        }
        if (blacklisted[to]) {
            revert BlacklistedAddress(to);
        }
        
        // Check transfer restrictions
        if (transferRestrictionsEnabled) {
            // Check transfer amount limit
            if (amount > maxTransferAmount) {
                revert TransferAmountExceedsLimit(amount, maxTransferAmount);
            }
            
            // Check minimum transfer delay
            if (minTransferDelay > 0 && lastTransferTime[from] + minTransferDelay > block.timestamp) {
                revert TransferTooSoon((lastTransferTime[from] + minTransferDelay) - block.timestamp);
            }
        }
        
        // Update last transfer time
        lastTransferTime[from] = block.timestamp;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Returns the current block number (used for voting checkpoints)
     * @return The current block number
     */
    function getCurrentBlock() external view returns (uint256) {
        return block.number;
    }
    
    /**
     * @dev Adds or removes an address from blacklist
     * @param account Address to blacklist/unblacklist
     * @param status True to blacklist, false to unblacklist
     */
    function setBlacklisted(address account, bool status) external onlyOwner {
        if (account == owner()) revert CannotBlacklistOwner();
        blacklisted[account] = status;
        emit Blacklisted(account, status);
    }
    
    /**
     * @dev Adds or removes authorized minter
     * @param minter Address to authorize/unauthorize
     * @param status True to authorize, false to unauthorize
     */
    function setAuthorizedMinter(address minter, bool status) external onlyOwner {
        authorizedMinters[minter] = status;
        emit AuthorizedMinter(minter, status);
    }
    
    /**
     * @dev Updates minting cap
     * @param newCap New minting cap
     */
    function setMintingCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert InvalidAmount();
        if (newCap > MAX_SUPPLY) revert InvalidAmount();
        mintingCap = newCap;
        emit MintingCapUpdated(newCap);
    }
    
    /**
     * @dev Updates transfer restrictions
     * @param enabled Whether transfer restrictions are enabled
     * @param minDelay Minimum delay between transfers
     * @param maxAmount Maximum transfer amount
     */
    function setTransferRestrictions(
        bool enabled,
        uint256 minDelay,
        uint256 maxAmount
    ) external onlyOwner {
        if (maxAmount == 0) revert InvalidAmount();
        transferRestrictionsEnabled = enabled;
        minTransferDelay = minDelay;
        maxTransferAmount = maxAmount;
        emit TransferRestrictionsUpdated(enabled, minDelay, maxAmount);
    }
    
    /**
     * @dev Updates transfer fee and fee collector
     * @param newFee New transfer fee in basis points
     * @param newCollector New fee collector address
     */
    function setTransferFee(uint256 newFee, address newCollector) external onlyOwner {
        if (newFee > MAX_TRANSFER_FEE) {
            revert InvalidFeeAmount(newFee, MAX_TRANSFER_FEE);
        }
        if (newCollector == address(0)) revert ZeroAddress();
        
        transferFee = newFee;
        feeCollector = newCollector;
        emit TransferFeeUpdated(newFee, newCollector);
    }
    
    /**
     * @dev Sets fee exemption status for an address
     * @param account Address to set fee exemption for
     * @param exempt True to exempt from fees, false to remove exemption
     */
    function setFeeExemption(address account, bool exempt) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        feeExempt[account] = exempt;
        emit FeeExemptionUpdated(account, exempt);
    }
    
    /**
     * @dev Batch sets fee exemption status for multiple addresses
     * @param accounts Array of addresses to set fee exemption for
     * @param exempt True to exempt from fees, false to remove exemption
     */
    function batchSetFeeExemption(address[] calldata accounts, bool exempt) external onlyOwner {
        uint256 accountsLength = accounts.length;
        if (accountsLength > 100) revert TooManyAccounts();
        
        for (uint256 i = 0; i < accountsLength;) {
            if (accounts[i] == address(0)) revert ZeroAddress();
            feeExempt[accounts[i]] = exempt;
            emit FeeExemptionUpdated(accounts[i], exempt);
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal function for stuck tokens
     * @param token Address of token to withdraw (use address(0) for ETH)
     * @param amount Amount to withdraw
     * @param to Address to send tokens to
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        // Emit event before all operations for consistency and reentrancy protection
        emit EmergencyWithdrawal(token, amount, to);
        
        if (token == address(0)) {
            // Withdraw ETH using call() for better compatibility
            if (address(this).balance < amount) revert InsufficientETHBalance();
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert ETHTransferFailed();
        } else if (token == address(this)) {
            // Withdraw this contract's tokens using internal _transfer to avoid reentrancy guard conflict
            _transfer(address(this), to, amount);
        } else {
            // Withdraw other ERC20 tokens
            if (!IERC20(token).transfer(to, amount)) revert TokenTransferFailed();
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Returns the voting power of an account at a specific block
     * @param account The account to check
     * @param blockNumber The block number to check at
     * @return The voting power at the specified block
     */
    function getPastVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        return super.getPastVotes(account, blockNumber);
    }
    
    /**
     * @dev Returns the current voting power of an account
     * @param account The account to check
     * @return The current voting power
     */
    function getVotes(address account) public view override returns (uint256) {
        return super.getVotes(account);
    }
    
    /**
     * @dev Returns the remaining supply that can be minted
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * @dev Returns the time remaining until next mint is allowed
     */
    function mintCooldownRemaining() external view returns (uint256) {
        uint256 nextMintTime = lastMintTime + MINT_COOLDOWN;
        if (block.timestamp >= nextMintTime) {
            return 0;
        }
        return nextMintTime - block.timestamp;
    }
    
    /**
     * @dev Returns transfer fee for a given amount
     * @param amount Transfer amount
     */
    function calculateTransferFee(uint256 amount) external view returns (uint256) {
        uint256 cachedTransferFee = transferFee;
        if (cachedTransferFee == 0) return 0;
        
        uint256 fee = (amount * cachedTransferFee) / 10000;
        return (fee == 0 && cachedTransferFee > 0) ? 1 : fee;
    }
    
    /**
     * @dev Checks if an address is exempt from transfer fees
     * @param account Address to check
     * @return True if exempt from fees, false otherwise
     */
    function isFeeExempt(address account) external view returns (bool) {
        return feeExempt[account];
    }
    
    /**
     * @dev Returns contract information
     */
    function getContractInfo() external view returns (
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _mintingCap,
        uint256 _transferFee,
        bool _transferRestrictionsEnabled,
        bool _paused
    ) {
        return (
            totalSupply(),
            MAX_SUPPLY,
            mintingCap,
            transferFee,
            transferRestrictionsEnabled,
            paused()
        );
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        // Allow contract to receive ETH
    }
}
