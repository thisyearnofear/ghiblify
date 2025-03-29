const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/' // fallback to original
];

export async function fetchFromIPFS(hash) {
  let lastError;
  
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${hash}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch from ${gateway}:`, error);
      lastError = error;
      continue; // Try next gateway
    }
  }
  
  // If we get here, all gateways failed
  throw lastError || new Error('All IPFS gateways failed');
}
