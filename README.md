# USDCSwap CCTP Bridge

A browser-based prototype for bridging native USDC with Circle CCTP V2 across Stellar and EVM testnets, with notes for adding Solana support next.

## Current Scope

- Static HTML/CSS/JavaScript app.
- Stellar Testnet source and destination support.
- EVM testnet routes for Base, Ethereum Sepolia, Arbitrum Sepolia, OP Sepolia, Avalanche Fuji, and Polygon Amoy.
- Circle CCTP V2 fee quote, Fast Transfer allowance, message polling, attestation handling, and manual receive fallback.
- Circle auto-delivery for eligible EVM destinations from EVM sources and Stellar testnet.
- Stellar `CctpForwarder` handling for inbound Stellar routes.
- Confirmed EVM transaction receipts before the UI advances approval, burn, or receive steps.
- Live source USDC balances with 25%, 50%, 75%, and MAX amount shortcuts.
- Browser extension and multi-chain WalletConnect wallet flows.

## Local Testing

Run a static server from the repo root:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

For deployed HTTPS testing, use Freighter extension for Stellar source approvals and browser EVM extensions such as MetaMask/Rabby/Coinbase for desktop EVM signing. WalletConnect remains the mobile-wallet fallback.

## Deployment

This app is static and can be deployed on GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any static host.

For GitHub Pages, publish from the root of the default branch. No build command is required.

## Important CCTP Notes

- Stellar USDC uses 7 decimal places; CCTP/EVM/Solana amounts use 6 decimal subunits.
- Stellar source approval and burn transactions are Soroban contract invocations. The signing wallet must support Soroban transaction XDR.
- EVM -> EVM and Stellar testnet -> EVM can use Circle Forwarding Service or manual destination `receiveMessage`.
- Forwarded EVM transfers are only marked complete after the destination transaction receipt succeeds.
- EVM/Solana -> Stellar must target Stellar `CctpForwarder` for inbound Stellar recipients.
- Solana support is planned but requires Solana wallet connection, Associated Token Account derivation, and Solana CCTP program account construction.

See [CIRCLE_CCTP_BUILD_NOTES.md](./CIRCLE_CCTP_BUILD_NOTES.md) for the implementation map and Circle documentation links.
