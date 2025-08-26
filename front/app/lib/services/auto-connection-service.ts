/**
 * Auto Connection Service (compat shim)
 * - Centralizes network switching for RainbowKit/wagmi
 * - Non-invasive: used where previously imported
 */
'use client';

import { switchChain } from '@wagmi/core';
import { config } from '../../providers/Web3Provider';

// Supported chains mapping by name
const CHAIN_BY_KEY: Record<string, number> = {
  base: 8453,
  celo: 42220,
  mainnet: 1,
  polygon: 137,
};

async function switchToChainId(targetChainId: number): Promise<boolean> {
  try {
    await switchChain(config, { chainId: targetChainId });
    return true;
  } catch (err) {
    console.warn('[auto-connection] switchChain failed:', err);
    return false;
  }
}

export const autoConnectionService = {
  /**
   * Attempt to switch the connected wallet network.
   * @param _address kept for backward compatibility (unused)
   * @param networkKey 'base' | 'celo' | 'mainnet' | 'polygon'
   */
  async switchNetwork(_address: string | undefined, networkKey: string): Promise<boolean> {
    const id = CHAIN_BY_KEY[networkKey];
    if (!id) return false;
    return switchToChainId(id);
  },
};

export default autoConnectionService;