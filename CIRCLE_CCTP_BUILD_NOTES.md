# Circle CCTP Build Notes

Last reviewed: 2026-08-03

## Current Chrome Test URL

Use the local HTTP server, not `file://`:

```text
http://localhost:4173/
```

Chrome wallet extensions and WalletConnect flows are more reliable from `localhost`. The app now boots route selectors and wallet modals before loading the remote wallet/CCTP SDK modules, so a failed CDN import should no longer freeze the basic UI.

## Product Shape

Circle recommends CCTP V2 for new crosschain USDC work. Bridge Kit/App Kit can simplify frontend bridging, especially for EVM and Solana, but this app still needs direct CCTP handling for Stellar-specific details such as `CctpForwarder`, 7-decimal Stellar USDC, and Soroban signing.

Best path:

1. Keep the direct CCTP implementation for Stellar routes.
2. Add Solana as a first-class chain type with Phantom/Solflare-compatible signing.
3. Consider Bridge Kit/App Kit for EVM/Solana-only routes after the manual flows are validated.

## Shared CCTP V2 Rules

- CCTP burns native USDC on the source domain, Iris signs the emitted message, then USDC is minted on the destination domain.
- Domain IDs are Circle IDs, not chain IDs. Core app domains: Ethereum `0`, Avalanche `1`, OP `2`, Arbitrum `3`, Solana `5`, Base `6`, Polygon PoS `7`, Stellar `27`.
- Fast Transfer uses `minFinalityThreshold = 1000`; Standard Transfer uses `2000`.
- Fast Transfer consumes Circle's global Fast Transfer allowance. If allowance is insufficient, the UI should offer Standard Transfer.
- Fees must be fetched from `/v2/burn/USDC/fees/{sourceDomain}/{destDomain}` and not hardcoded. Use `forward=true` when quoting Circle Forwarding Service routes.
- For Forwarding Service routes, `maxFee` must cover the CCTP protocol fee plus the forwarding fee. Circle recommends a buffer.
- Attestations come from `/v2/messages/{sourceDomainId}?transactionHash=...`. Forwarding routes should not be marked complete just because an attestation exists; the UI should wait for a destination/forward transaction hash or offer manual receive recovery.
- EVM approvals, burns, manual receives, and forwarded destination transactions must have successful receipts before their steps are marked complete.

## EVM Routes

- Use `TokenMessengerV2` to burn and `MessageTransmitterV2.receiveMessage(message, attestation)` for manual receive.
- `depositForBurnWithHook` parameters include `amount`, `destinationDomain`, `mintRecipient`, `burnToken`, `destinationCaller`, `maxFee`, `minFinalityThreshold`, and `hookData`.
- EVM wallet recipients must be encoded as 32 bytes by left-padding the 20-byte address.
- For Circle Forwarding Service, use the static hook data when no destination setup is needed:

```text
0x636374702d666f72776172640000000000000000000000000000000000000000
```

## Solana Routes

- Solana is CCTP domain `5` and supports Standard Transfer, Fast Transfer, and Forwarding Service.
- CCTP V2 on Solana uses two programs: `MessageTransmitterV2` and `TokenMessengerMinterV2`.
- Program IDs are the same in current docs for mainnet and devnet:
  - `MessageTransmitterV2`: `CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC`
  - `TokenMessengerMinterV2`: `CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe`
- Source-side Solana burns require Solana-specific PDA/account construction, including a client-generated `MessageSent` event account.
- Destination-side Solana forwarding must use the recipient's USDC Associated Token Account as `mintRecipient`, not the wallet address.
- If the recipient has no USDC ATA and the app wants Circle to create it, quote with:

```text
/v2/burn/USDC/fees/{sourceDomain}/{destDomain}?forward=true&includeRecipientSetup=true
```

Then encode the extended forwarding hook data with ATA setup fields.

## Stellar Routes

- Stellar is CCTP domain `27`.
- Stellar USDC has 7 decimals, while CCTP/EVM/Solana USDC amounts use 6 decimal subunits. Route math must convert carefully.
- Stellar CCTP messages store 32-byte raw address payloads without the `G`, `M`, or `C` strkey type marker.
- For inbound transfers to a Stellar user or muxed account, always set both `mintRecipient` and `destinationCaller` to the Stellar `CctpForwarder` contract address and put the final Stellar recipient strkey in hook data.
- If `mintRecipient` is a Stellar user account instead of `CctpForwarder`, or `destinationCaller` is wrong, funds can become permanently stuck.
- Stellar `decodedMessage` fields may be `null` in Circle API responses because the API cannot infer address type from raw 32-byte payloads; parse the raw `message` if needed.
- Stellar exposes `deposit_for_burn_with_hook`, and Circle's Forwarding Service is requested through source burn hook data. The app enables this for Stellar-to-EVM test routes but keeps it disabled for Stellar mainnet until a signed testnet transfer succeeds.
- Stellar source approval and burn transactions are Soroban contract invocations. The connected wallet must be able to parse and sign Soroban transaction XDRs; older/classic-only WalletConnect paths can fail with low-level XDR errors such as `Bad union switch`.

## Implementation Checklist

- Complete signed testnet transfers for Stellar -> EVM auto-delivery, EVM -> EVM auto-delivery, and EVM -> Stellar manual forwarder receive.
- Add Solana chain config for devnet/mainnet, including USDC mint, RPC, explorers, and CCTP program IDs.
- Add Solana wallet connection layer: Phantom, Solflare, and manual receive address.
- Add Solana address validation and ATA derivation.
- Add route model branches:
  - EVM -> EVM: Forwarding Service or manual receive.
  - EVM -> Solana: Forwarding Service with ATA handling.
  - Solana -> EVM: Solana burn, EVM manual receive or forwarding.
  - Solana -> Stellar: Solana burn targeting Stellar `CctpForwarder`.
  - Stellar -> EVM: Forwarding Service or manual receive; Stellar -> Solana remains pending Solana integration.
  - EVM/Solana -> Stellar: always Stellar `CctpForwarder`.
- Add recovery panel for every route: burn hash, message, attestation, destination receive/forward tx, re-attest.

## Sources

- Circle Crosschain Transfers: https://developers.circle.com/crosschain-transfers
- Transfer USDC to and from Stellar: https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc
- CCTP overview: https://developers.circle.com/cctp
- Supported blockchains and domains: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
- EVM contract addresses: https://developers.circle.com/cctp/references/contract-addresses
- EVM contract interfaces: https://developers.circle.com/cctp/references/contract-interfaces
- Solana programs and interfaces: https://developers.circle.com/cctp/references/solana-programs
- CCTP on Stellar: https://developers.circle.com/cctp/references/stellar
- Stellar contracts and interfaces: https://developers.circle.com/cctp/references/stellar-contracts
- Forwarding Service: https://developers.circle.com/cctp/concepts/forwarding-service
- Transfer fees: https://developers.circle.com/cctp/concepts/fees
- Get transfer fee: https://developers.circle.com/cctp/howtos/get-transfer-fee
- Fast Transfer allowance: https://developers.circle.com/cctp/concepts/fast-transfer-allowance
- Get Fast Transfer allowance: https://developers.circle.com/cctp/howtos/get-fast-transfer-allowance
- Solana to EVM quickstart: https://developers.circle.com/cctp/quickstarts/transfer-usdc-solana-to-arc
