"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import Web3Avatar from "./Web3Avatar";
import SignInWithBase from "./SignInWithBase.jsx";

export default function Web3Button() {
  const { address, isConnected } = useAccount();
  const [showBaseAuth, setShowBaseAuth] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Use environment-aware API URL
      const API_URL =
        process.env.NODE_ENV === "development"
          ? "http://localhost:8000"
          : "https://ghiblify.onrender.com";

      // Send the address to your backend to get/create a session
      fetch(`${API_URL}/api/auth/web3/login`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://ghiblify-it.vercel.app",
        },
        body: JSON.stringify({ address }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("ghiblify_token", data.token);
          }
        })
        .catch((error) => {
          console.error("Web3 login error:", error);
        });
    }
  }, [isConnected, address]);

  const handleBaseAuthSuccess = (result) => {
    console.log("Base authentication successful:", result);
    // Store authentication result or trigger any necessary state updates
    localStorage.setItem("ghiblify_auth", JSON.stringify(result));
    setShowBaseAuth(false);
  };

  const handleBaseAuthError = (error) => {
    console.error("Base authentication failed:", error);
    setShowBaseAuth(false);
  };

  // If showing Base auth modal, render it
  if (showBaseAuth) {
    return (
      <div className="flex flex-col gap-4 items-center">
        <SignInWithBase
          onSuccess={handleBaseAuthSuccess}
          onError={handleBaseAuthError}
        />
        <button
          onClick={() => setShowBaseAuth(false)}
          className="text-gray-500 text-sm hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        if (!ready) return null;

        if (!account) {
          return (
            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-2">
                <button
                  onClick={openConnectModal}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={() => setShowBaseAuth(true)}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold"
                >
                  🔵 Sign in with Base
                </button>
              </div>
              <div className="text-xs text-gray-600 text-center max-w-md">
                <span className="font-medium">💡 Tip:</span> Use &ldquo;Sign in
                with Base&rdquo; for Base Pay discounts and seamless payments
              </div>
            </div>
          );
        }

        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Wrong network
            </button>
          );
        }

        const hasBaseAuth =
          typeof window !== "undefined" &&
          localStorage.getItem("ghiblify_auth");

        return (
          <div className="flex items-center gap-4">
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {chain.name}
            </button>

            <button
              onClick={openAccountModal}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Web3Avatar address={account.address} size={24} />
              <span>{account.displayName}</span>
              {account.displayBalance && (
                <span className="text-gray-500">{account.displayBalance}</span>
              )}
            </button>

            {/* Base Account Status */}
            {hasBaseAuth ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                <span>🔵</span>
                <span>Base Account</span>
              </div>
            ) : (
              <button
                onClick={() => setShowBaseAuth(true)}
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition-colors"
              >
                <span>🔵</span>
                <span>Add Base Account</span>
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
