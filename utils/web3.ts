// Web3 utilities for blockchain interactions and smart contract management

import { web3Logger } from '../config/logger';
import { performance, errorTracking } from '../config/monitoring';

// Web3 configuration types
export interface Web3Config {
  rpcUrl: string;
  chainId: number;
  networkName: string;
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  confirmations?: number;
  timeout?: number;
}

// Transaction types
export interface TransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  data?: string;
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: number;
  status: boolean;
  logs: any[];
  contractAddress?: string;
}

// Smart contract types
export interface ContractConfig {
  address: string;
  abi: any[];
  bytecode?: string;
}

export interface ContractCall {
  method: string;
  params: any[];
  options?: {
    from?: string;
    value?: string;
    gasLimit?: number;
  };
}

// Wallet types
export interface WalletInfo {
  address: string;
  balance: string;
  nonce: number;
  isContract: boolean;
}

// Token types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  formattedBalance: string;
}

// Web3 error types
export class Web3Error extends Error {
  public readonly code?: string;
  public readonly data?: any;
  public readonly transactionHash?: string;

  constructor(message: string, code?: string, data?: any, transactionHash?: string) {
    super(message);
    this.name = 'Web3Error';
    this.code = code;
    this.data = data;
    this.transactionHash = transactionHash;
  }
}

// Base Web3 provider interface
export interface Web3Provider {
  getBalance(address: string): Promise<string>;
  getTransactionCount(address: string): Promise<number>;
  getTransaction(hash: string): Promise<any>;
  getTransactionReceipt(hash: string): Promise<TransactionReceipt | null>;
  sendTransaction(transaction: TransactionRequest): Promise<string>;
  call(transaction: TransactionRequest): Promise<string>;
  estimateGas(transaction: TransactionRequest): Promise<number>;
  getBlockNumber(): Promise<number>;
  getBlock(blockNumber: number | string): Promise<any>;
  getLogs(filter: any): Promise<any[]>;
}

// Web3 utilities class
export class Web3Utils {
  private provider: Web3Provider;
  private config: Web3Config;

  constructor(provider: Web3Provider, config: Web3Config) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(address: string): Promise<WalletInfo> {
    const timer = performance.startTimer('get-wallet-info');
    
    try {
      web3Logger.debug('Getting wallet info', { address });
      
      const [balance, nonce, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.call({ to: address, data: '0x' })
      ]);
      
      const isContract = code !== '0x';
      
      const duration = timer();
      web3Logger.info('Wallet info retrieved', {
        address,
        duration,
        isContract,
      });
      
      return {
        address,
        balance,
        nonce,
        isContract,
      };
    } catch (error) {
      const duration = timer();
      web3Logger.error('Failed to get wallet info', error instanceof Error ? error : new Error(String(error)), {
        address,
        duration,
      });
      throw error;
    }
  }

  /**
   * Send transaction with retry logic
   */
  async sendTransaction(
    transaction: TransactionRequest,
    retries: number = 3
  ): Promise<TransactionReceipt> {
    const timer = performance.startTimer('send-transaction');
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        web3Logger.debug('Sending transaction', {
          attempt,
          to: transaction.to,
          value: transaction.value,
        });
        
        // Estimate gas if not provided
        if (!transaction.gasLimit) {
          transaction.gasLimit = await this.provider.estimateGas(transaction);
        }
        
        const txHash = await this.provider.sendTransaction(transaction);
        
        web3Logger.info('Transaction sent', {
          transactionHash: txHash,
          attempt,
        });
        
        // Wait for confirmation
        const receipt = await this.waitForTransaction(txHash);
        
        const duration = timer();
        web3Logger.info('Transaction confirmed', {
          transactionHash: txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          duration,
        });
        
        return receipt;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        web3Logger.warn('Transaction attempt failed', {
          attempt,
          retriesLeft: retries - attempt,
          error: lastError.message,
        });
        
        if (attempt < retries) {
          // Wait before retry with exponential backoff
          await this.delay(1000 * Math.pow(2, attempt - 1));
        }
      }
    }
    
    const duration = timer();
    web3Logger.error('Transaction failed after all retries', lastError!, {
      retries,
      duration,
    });
    
    errorTracking.captureException(lastError!, {
      context: 'web3-transaction-failed',
      transaction,
      retries,
    });
    
    throw lastError!;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = this.config.confirmations || 1,
    timeout: number = this.config.timeout || 300000
  ): Promise<TransactionReceipt> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          const currentBlock = await this.provider.getBlockNumber();
          const confirmationCount = currentBlock - receipt.blockNumber + 1;
          
          if (confirmationCount >= confirmations) {
            if (!receipt.status) {
              throw new Web3Error(
                'Transaction failed',
                'TRANSACTION_FAILED',
                receipt,
                txHash
              );
            }
            return receipt;
          }
        }
        
        // Wait before checking again
        await this.delay(2000);
      } catch (error) {
        if (error instanceof Web3Error) {
          throw error;
        }
        // Continue waiting for other errors
        await this.delay(2000);
      }
    }
    
    throw new Web3Error(
      'Transaction confirmation timeout',
      'CONFIRMATION_TIMEOUT',
      { txHash, timeout },
      txHash
    );
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      web3Logger.debug('Getting token info', { tokenAddress });
      
      // Standard ERC-20 function signatures
      const nameCall = { to: tokenAddress, data: '0x06fdde03' }; // name()
      const symbolCall = { to: tokenAddress, data: '0x95d89b41' }; // symbol()
      const decimalsCall = { to: tokenAddress, data: '0x313ce567' }; // decimals()
      const totalSupplyCall = { to: tokenAddress, data: '0x18160ddd' }; // totalSupply()
      
      const [nameResult, symbolResult, decimalsResult, totalSupplyResult] = await Promise.all([
        this.provider.call(nameCall),
        this.provider.call(symbolCall),
        this.provider.call(decimalsCall),
        this.provider.call(totalSupplyCall),
      ]);
      
      const name = this.decodeString(nameResult);
      const symbol = this.decodeString(symbolResult);
      const decimals = parseInt(decimalsResult, 16);
      const totalSupply = BigInt(totalSupplyResult).toString();
      
      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply,
      };
    } catch (error) {
      web3Logger.error('Failed to get token info', error instanceof Error ? error : new Error(String(error)), {
        tokenAddress,
      });
      throw error;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalance> {
    try {
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      
      // balanceOf(address) function signature
      const balanceCall = {
        to: tokenAddress,
        data: '0x70a08231' + walletAddress.slice(2).padStart(64, '0'),
      };
      
      const balanceResult = await this.provider.call(balanceCall);
      const balance = BigInt(balanceResult).toString();
      const formattedBalance = this.formatTokenAmount(balance, tokenInfo.decimals);
      
      return {
        token: tokenInfo,
        balance,
        formattedBalance,
      };
    } catch (error) {
      web3Logger.error('Failed to get token balance', error instanceof Error ? error : new Error(String(error)), {
        tokenAddress,
        walletAddress,
      });
      throw error;
    }
  }

  /**
   * Format token amount with decimals
   */
  formatTokenAmount(amount: string, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const quotient = BigInt(amount) / divisor;
    const remainder = BigInt(amount) % divisor;
    
    if (remainder === BigInt(0)) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    return `${quotient}.${trimmedRemainder}`;
  }

  /**
   * Parse token amount to wei
   */
  parseTokenAmount(amount: string, decimals: number): string {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    const wei = BigInt(whole + paddedFraction);
    return wei.toString();
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate transaction hash
   */
  isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Convert Wei to Ether
   */
  weiToEther(wei: string): string {
    return this.formatTokenAmount(wei, 18);
  }

  /**
   * Convert Ether to Wei
   */
  etherToWei(ether: string): string {
    return this.parseTokenAmount(ether, 18);
  }

  /**
   * Convert Wei to Gwei
   */
  weiToGwei(wei: string): string {
    return this.formatTokenAmount(wei, 9);
  }

  /**
   * Convert Gwei to Wei
   */
  gweiToWei(gwei: string): string {
    return this.parseTokenAmount(gwei, 9);
  }

  /**
   * Generate random private key
   */
  generatePrivateKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Decode string from contract call result
   */
  private decodeString(data: string): string {
    if (data.length < 130) return '';
    
    const offset = parseInt(data.slice(2, 66), 16) * 2 + 2;
    const length = parseInt(data.slice(offset, offset + 64), 16) * 2;
    const stringData = data.slice(offset + 64, offset + 64 + length);
    
    return Buffer.from(stringData, 'hex').toString('utf8');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Smart contract interaction utilities
export class SmartContract {
  private provider: Web3Provider;
  private config: ContractConfig;
  private web3Utils: Web3Utils;

  constructor(provider: Web3Provider, config: ContractConfig, web3Config: Web3Config) {
    this.provider = provider;
    this.config = config;
    this.web3Utils = new Web3Utils(provider, web3Config);
  }

  /**
   * Call contract method (read-only)
   */
  async call(method: string, params: any[] = [], from?: string): Promise<any> {
    try {
      const data = this.encodeMethodCall(method, params);
      const result = await this.provider.call({
        to: this.config.address,
        data,
        from,
      });
      
      return this.decodeResult(result, method);
    } catch (error) {
      web3Logger.error('Contract call failed', error instanceof Error ? error : new Error(String(error)), {
        contract: this.config.address,
        method,
        params,
      });
      throw error;
    }
  }

  /**
   * Send contract transaction (state-changing)
   */
  async send(
    method: string,
    params: any[] = [],
    options: {
      from: string;
      value?: string;
      gasLimit?: number;
      gasPrice?: string;
    }
  ): Promise<TransactionReceipt> {
    try {
      const data = this.encodeMethodCall(method, params);
      
      const transaction: TransactionRequest = {
        to: this.config.address,
        data,
        from: options.from,
        value: options.value,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
      };
      
      return await this.web3Utils.sendTransaction(transaction);
    } catch (error) {
      web3Logger.error('Contract transaction failed', error instanceof Error ? error : new Error(String(error)), {
        contract: this.config.address,
        method,
        params,
        options,
      });
      throw error;
    }
  }

  /**
   * Estimate gas for contract method
   */
  async estimateGas(
    method: string,
    params: any[] = [],
    options: { from: string; value?: string }
  ): Promise<number> {
    const data = this.encodeMethodCall(method, params);
    
    return await this.provider.estimateGas({
      to: this.config.address,
      data,
      from: options.from,
      value: options.value,
    });
  }

  /**
   * Get contract events
   */
  async getEvents(
    eventName: string,
    fromBlock: number = 0,
    toBlock: number | string = 'latest'
  ): Promise<any[]> {
    const eventSignature = this.getEventSignature(eventName);
    
    const logs = await this.provider.getLogs({
      address: this.config.address,
      topics: [eventSignature],
      fromBlock,
      toBlock,
    });
    
    return logs.map(log => this.decodeEvent(log, eventName));
  }

  /**
   * Encode method call data
   */
  private encodeMethodCall(method: string, params: any[]): string {
    // This is a simplified implementation
    // In a real implementation, you would use a proper ABI encoder
    const methodAbi = this.config.abi.find(item => item.name === method && item.type === 'function');
    if (!methodAbi) {
      throw new Error(`Method ${method} not found in ABI`);
    }
    
    // Generate method signature (first 4 bytes of keccak256 hash)
    const signature = this.getMethodSignature(method, methodAbi.inputs);
    
    // Encode parameters (simplified)
    const encodedParams = this.encodeParameters(params, methodAbi.inputs);
    
    return signature + encodedParams;
  }

  /**
   * Get method signature
   */
  private getMethodSignature(method: string, inputs: any[]): string {
    const types = inputs.map(input => input.type).join(',');
    const functionSignature = `${method}(${types})`;
    
    // In a real implementation, you would use keccak256
    // This is a placeholder
    return '0x' + functionSignature.slice(0, 8).padEnd(8, '0');
  }

  /**
   * Get event signature
   */
  private getEventSignature(eventName: string): string {
    const eventAbi = this.config.abi.find(item => item.name === eventName && item.type === 'event');
    if (!eventAbi) {
      throw new Error(`Event ${eventName} not found in ABI`);
    }
    
    const types = eventAbi.inputs.map((input: any) => input.type).join(',');
    const eventSignature = `${eventName}(${types})`;
    
    // In a real implementation, you would use keccak256
    // This is a placeholder
    return '0x' + eventSignature.slice(0, 64).padEnd(64, '0');
  }

  /**
   * Encode parameters (simplified)
   */
  private encodeParameters(params: any[], inputs: any[]): string {
    // This is a very simplified implementation
    // In a real implementation, you would use proper ABI encoding
    return params.map(param => {
      if (typeof param === 'string' && param.startsWith('0x')) {
        return param.slice(2).padStart(64, '0');
      }
      if (typeof param === 'number') {
        return param.toString(16).padStart(64, '0');
      }
      return param.toString().padStart(64, '0');
    }).join('');
  }

  /**
   * Decode result (simplified)
   */
  private decodeResult(result: string, method: string): any {
    // This is a simplified implementation
    // In a real implementation, you would use proper ABI decoding
    if (result === '0x') return null;
    
    const methodAbi = this.config.abi.find(item => item.name === method && item.type === 'function');
    if (!methodAbi || !methodAbi.outputs || methodAbi.outputs.length === 0) {
      return result;
    }
    
    // Simple decoding for common types
    const output = methodAbi.outputs[0];
    if (output.type === 'uint256' || output.type === 'uint') {
      return BigInt(result).toString();
    }
    if (output.type === 'bool') {
      return result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    if (output.type === 'string') {
      return this.web3Utils['decodeString'](result);
    }
    
    return result;
  }

  /**
   * Decode event (simplified)
   */
  private decodeEvent(log: any, eventName: string): any {
    // This is a simplified implementation
    // In a real implementation, you would use proper event decoding
    return {
      event: eventName,
      address: log.address,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      data: log.data,
      topics: log.topics,
    };
  }
}

// Gas price utilities
export class GasUtils {
  private provider: Web3Provider;

  constructor(provider: Web3Provider) {
    this.provider = provider;
  }

  /**
   * Get current gas price
   */
  async getCurrentGasPrice(): Promise<string> {
    // This would typically call eth_gasPrice
    // Placeholder implementation
    return '20000000000'; // 20 Gwei
  }

  /**
   * Estimate optimal gas price
   */
  async estimateGasPrice(priority: 'slow' | 'standard' | 'fast' = 'standard'): Promise<{
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    const baseGasPrice = await this.getCurrentGasPrice();
    const basePrice = BigInt(baseGasPrice);
    
    const multipliers = {
      slow: { gas: 0.8, priority: 1 },
      standard: { gas: 1.0, priority: 1.5 },
      fast: { gas: 1.2, priority: 2 },
    };
    
    const multiplier = multipliers[priority];
    const gasPrice = (basePrice * BigInt(Math.floor(multiplier.gas * 100)) / BigInt(100)).toString();
    const maxFeePerGas = (basePrice * BigInt(Math.floor(multiplier.gas * 120)) / BigInt(100)).toString();
    const maxPriorityFeePerGas = (basePrice * BigInt(Math.floor(multiplier.priority * 100)) / BigInt(100)).toString();
    
    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }
}

// Network utilities
export const NETWORKS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io',
  },
  goerli: {
    chainId: 5,
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/',
    explorerUrl: 'https://goerli.etherscan.io',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  bsc: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
  },
};

export const getNetworkConfig = (chainId: number) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

export const getExplorerUrl = (chainId: number, hash: string, type: 'tx' | 'address' = 'tx') => {
  const network = getNetworkConfig(chainId);
  if (!network) return null;
  
  return `${network.explorerUrl}/${type}/${hash}`;
};

export default Web3Utils;