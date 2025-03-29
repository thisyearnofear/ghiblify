'use client';

import { useState, useEffect } from 'react';
import { fetchFromIPFS } from '../utils/ipfs';
import Image from 'next/image';

export default function Web3Avatar({ address, size = 32 }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!address) return;
      
      try {
        // Try to get ENS avatar
        const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
        const { avatar } = await response.json();
        
        if (avatar?.includes('ipfs://')) {
          const ipfsHash = avatar.replace('ipfs://', '');
          const metadata = await fetchFromIPFS(ipfsHash);
          
          if (metadata?.image) {
            const imageHash = metadata.image.replace('ipfs://', '');
            const imageData = await fetchFromIPFS(imageHash);
            setAvatarUrl(imageData);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch avatar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvatar();
  }, [address]);

  if (loading) {
    return <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#eee' }} />;
  }

  if (!avatarUrl) {
    // Generate blockie or use default avatar
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          backgroundColor: `#${address?.slice(2, 8)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: size / 2
        }}
      >
        {address ? address.slice(2, 4) : '?'}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt="Avatar"
      width={size}
      height={size}
      style={{ borderRadius: '50%' }}
    />
  );
}
