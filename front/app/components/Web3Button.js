"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState, useRef } from "react";
import Web3Avatar from "./Web3Avatar";
import SignInWithBase from "./SignInWithBase.jsx";

export default function Web3Button() {
  const { address, isConnected } = useAccount();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showBaseAuth, setShowBaseAuth] = useState(false);
  const modalRef = useRef(null);

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

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowConnectionModal(false);
        setShowBaseAuth(false);
      }
    }

    if (showConnectionModal || showBaseAuth) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showConnectionModal, showBaseAuth]);

  const handleBaseAuthSuccess = (result) => {
    console.log("Base authentication successful:", result);
    localStorage.setItem("ghiblify_auth", JSON.stringify(result));
    setShowBaseAuth(false);
    setShowConnectionModal(false);
  };

  const handleBaseAuthError = (error) => {
    console.error("Base authentication failed:", error);
    setShowBaseAuth(false);
  };

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
            <div className="relative">
              <button
                onClick={() => setShowConnectionModal(!showConnectionModal)}
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Connect Wallet
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showConnectionModal ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Connection Options Modal */}
              {showConnectionModal && (
                <div
                  ref={modalRef}
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50"
                >
                  <div className="space-y-2">
                    {/* RainbowKit Option */}
                    <button
                      onClick={() => {
                        openConnectModal();
                        setShowConnectionModal(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <div className="font-medium text-gray-900">
                        RainbowKit
                      </div>
                    </button>

                    {/* Base Option */}
                    <button
                      onClick={() => {
                        setShowBaseAuth(true);
                        setShowConnectionModal(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">B</span>
                      </div>
                      <div className="font-medium text-gray-900">
                        Sign in with Base
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Base Auth Modal */}
              {showBaseAuth && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div
                    ref={modalRef}
                    className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Sign in with Base
                      </h3>
                      <button
                        onClick={() => setShowBaseAuth(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <SignInWithBase
                      onSuccess={handleBaseAuthSuccess}
                      onError={handleBaseAuthError}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
            >
              Wrong Network
            </button>
          );
        }

        const hasBaseAuth =
          typeof window !== "undefined" &&
          localStorage.getItem("ghiblify_auth");

        return (
          <div className="flex items-center gap-3">
            {/* Chain Selector */}
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              {chain.name}
            </button>

            {/* Account Button */}
            <button
              onClick={openAccountModal}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Web3Avatar address={account.address} size={24} />
              <span className="font-medium">{account.displayName}</span>
              {account.displayBalance && (
                <span className="text-gray-500 text-sm">
                  {account.displayBalance}
                </span>
              )}
            </button>

            {/* Base Account Status */}
            {hasBaseAuth && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                <span>🔵</span>
                <span>Base Pay</span>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
