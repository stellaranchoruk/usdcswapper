const DECIMALS_EVM = 6n;
const DECIMALS_STELLAR = 7n;
const ZERO_BYTES32 = new Uint8Array(32);
const ZERO_BYTES32_HEX = `0x${"00".repeat(32)}`;
const CIRCLE_FORWARD_HOOK =
  "0x636374702d666f72776172640000000000000000000000000000000000000000";
const TIMEOUT_SECONDS = 180;
const EVM_RECEIPT_TIMEOUT_MS = 240000;
const AUTO_DELIVERY_GRACE_MS = 120000;
const MAX_BURN_UNITS6 = 10000000n * 10n ** DECIMALS_EVM;
const WALLETCONNECT_PROJECT_ID = "f658ce3a7c8a185214974f71539fea39";
const VAULT_SIGNER_KEY = "GA2T6GR7VXXXBETTERSAFETHANSORRYXXXPROTECTEDBYLOBSTRVAULT";

let StellarSdk = null;
let SignClient = null;
let viem = null;

async function loadStellarSdk() {
  if (StellarSdk) return StellarSdk;
  const module = await import("https://esm.sh/@stellar/stellar-sdk@14.1.1?bundle");
  StellarSdk = module.default ?? module;
  return StellarSdk;
}

async function loadSignClient() {
  if (SignClient) return SignClient;
  const module = await import("https://esm.sh/@walletconnect/sign-client@2.21.8?target=es2022");
  SignClient = module.default ?? module;
  return SignClient;
}

async function loadViem() {
  if (viem) return viem;
  viem = await import("https://esm.sh/viem@2.38.5");
  return viem;
}

const EVM_CONTRACTS = {
  testnet: {
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  mainnet: {
    tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
    messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
  },
};

const NETWORKS = {
  testnet: {
    label: "Testnet",
    irisApiUrl: "https://iris-api-sandbox.circle.com",
    stellar: {
      id: "stellar-testnet",
      kind: "stellar",
      label: "Stellar Testnet",
      shortLabel: "Stellar",
      domain: 27,
      sourceStandard: true,
      sourceFast: true,
      forwardingDestination: false,
      networkPassphrase: "Test SDF Network ; September 2015",
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      explorerTx: "https://stellar.expert/explorer/testnet/tx/",
      tokenMessengerMinter: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
      messageTransmitter: "CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY",
      cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
      usdcContract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      usdcIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
    evm: [
      {
        id: "base-sepolia",
        label: "Base Sepolia",
        shortLabel: "Base",
        kind: "evm",
        domain: 6,
        chainId: 84532,
        symbol: "ETH",
        rpcUrl: "https://sepolia.base.org",
        explorerTx: "https://sepolia.basescan.org/tx/",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "ethereum-sepolia",
        label: "Ethereum Sepolia",
        shortLabel: "Ethereum",
        kind: "evm",
        domain: 0,
        chainId: 11155111,
        symbol: "ETH",
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        explorerTx: "https://sepolia.etherscan.io/tx/",
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "arbitrum-sepolia",
        label: "Arbitrum Sepolia",
        shortLabel: "Arbitrum",
        kind: "evm",
        domain: 3,
        chainId: 421614,
        symbol: "ETH",
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        explorerTx: "https://sepolia.arbiscan.io/tx/",
        usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "op-sepolia",
        label: "OP Sepolia",
        shortLabel: "OP",
        kind: "evm",
        domain: 2,
        chainId: 11155420,
        symbol: "ETH",
        rpcUrl: "https://sepolia.optimism.io",
        explorerTx: "https://sepolia-optimism.etherscan.io/tx/",
        usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "avalanche-fuji",
        label: "Avalanche Fuji",
        shortLabel: "Fuji",
        kind: "evm",
        domain: 1,
        chainId: 43113,
        symbol: "AVAX",
        rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
        explorerTx: "https://testnet.snowtrace.io/tx/",
        usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
        sourceStandard: true,
        sourceFast: false,
        forwardingDestination: true,
      },
      {
        id: "polygon-amoy",
        label: "Polygon Amoy",
        shortLabel: "Polygon",
        kind: "evm",
        domain: 7,
        chainId: 80002,
        symbol: "POL",
        rpcUrl: "https://rpc-amoy.polygon.technology",
        explorerTx: "https://amoy.polygonscan.com/tx/",
        usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
        sourceStandard: true,
        sourceFast: false,
        forwardingDestination: true,
      },
    ],
  },
  mainnet: {
    label: "Mainnet",
    irisApiUrl: "https://iris-api.circle.com",
    stellar: {
      id: "stellar",
      kind: "stellar",
      label: "Stellar",
      shortLabel: "Stellar",
      domain: 27,
      sourceStandard: true,
      sourceFast: true,
      forwardingDestination: false,
      networkPassphrase: "Public Global Stellar Network ; September 2015",
      horizonUrl: "https://horizon.stellar.org",
      sorobanRpcUrl: "https://mainnet.sorobanrpc.com",
      explorerTx: "https://stellar.expert/explorer/public/tx/",
      tokenMessengerMinter: "CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL",
      messageTransmitter: "CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV",
      cctpForwarder: "CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T",
      usdcContract: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
      usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    },
    evm: [
      {
        id: "base",
        label: "Base",
        shortLabel: "Base",
        kind: "evm",
        domain: 6,
        chainId: 8453,
        symbol: "ETH",
        rpcUrl: "https://mainnet.base.org",
        explorerTx: "https://basescan.org/tx/",
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "ethereum",
        label: "Ethereum",
        shortLabel: "Ethereum",
        kind: "evm",
        domain: 0,
        chainId: 1,
        symbol: "ETH",
        rpcUrl: "https://ethereum-rpc.publicnode.com",
        explorerTx: "https://etherscan.io/tx/",
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "arbitrum",
        label: "Arbitrum",
        shortLabel: "Arbitrum",
        kind: "evm",
        domain: 3,
        chainId: 42161,
        symbol: "ETH",
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        explorerTx: "https://arbiscan.io/tx/",
        usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "op",
        label: "OP Mainnet",
        shortLabel: "OP",
        kind: "evm",
        domain: 2,
        chainId: 10,
        symbol: "ETH",
        rpcUrl: "https://mainnet.optimism.io",
        explorerTx: "https://optimistic.etherscan.io/tx/",
        usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        sourceStandard: true,
        sourceFast: true,
        forwardingDestination: true,
      },
      {
        id: "avalanche",
        label: "Avalanche",
        shortLabel: "Avax",
        kind: "evm",
        domain: 1,
        chainId: 43114,
        symbol: "AVAX",
        rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        explorerTx: "https://snowtrace.io/tx/",
        usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        sourceStandard: true,
        sourceFast: false,
        forwardingDestination: true,
      },
      {
        id: "polygon",
        label: "Polygon PoS",
        shortLabel: "Polygon",
        kind: "evm",
        domain: 7,
        chainId: 137,
        symbol: "POL",
        rpcUrl: "https://polygon-rpc.com",
        explorerTx: "https://polygonscan.com/tx/",
        usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        sourceStandard: true,
        sourceFast: false,
        forwardingDestination: true,
      },
    ],
  },
};

const ids = [
  "toastWrap",
  "networkBadge",
  "routeSubtitle",
  "resetBtn",
  "sourceChain",
  "destChain",
  "swapRouteBtn",
  "sourceBalanceOut",
  "amountInput",
  "recipientInput",
  "sourceWalletBtn",
  "sourceWalletTitle",
  "sourceWalletMeta",
  "destWalletBtn",
  "destWalletTitle",
  "destWalletMeta",
  "useConnectedRecipientBtn",
  "refreshQuoteBtn",
  "refreshAllowanceBtn",
  "fastBtn",
  "fastMeta",
  "standardBtn",
  "forwardingToggleWrap",
  "forwardingToggle",
  "feeBufferInput",
  "routeNotice",
  "routeNoticeTitle",
  "routeNoticeText",
  "quoteStatus",
  "burnAmountOut",
  "receiveAmountOut",
  "feeEstimateOut",
  "maxFeeOut",
  "forwardFeeOut",
  "protocolFeeOut",
  "quoteNote",
  "mainActionBtn",
  "mainHelper",
  "timeline",
  "successPanel",
  "successText",
  "successApproveTx",
  "successBurnTx",
  "successReceiveTx",
  "copySummaryBtn",
  "testnetBtn",
  "mainnetBtn",
  "envOut",
  "mainnetArmedOut",
  "armMainnetBtn",
  "stellarConnOut",
  "evmConnOut",
  "vaultModeOut",
  "sourceDomainOut",
  "destDomainOut",
  "deliveryOut",
  "allowanceOut",
  "routeModelNote",
  "tokenMessengerOut",
  "messageTransmitterOut",
  "forwarderOut",
  "usdcOut",
  "advancedToggle",
  "advancedArea",
  "burnHashInput",
  "nonceInput",
  "fetchMessageBtn",
  "resumePollingBtn",
  "verifyAttestationBtn",
  "reattestBtn",
  "messageText",
  "attestationText",
  "useAttestationBtn",
  "manualReceiveBtn",
  "logBox",
  "backdrop",
  "connectModal",
  "connectTitle",
  "connectSubtitle",
  "connectOptions",
  "qrArea",
  "qrCanvas",
  "qrFallback",
  "openMobileWalletBtn",
  "copyWcBtn",
  "qrStatus",
  "manualArea",
  "manualLabel",
  "manualAddressInput",
  "useManualAddressBtn",
  "signingModal",
  "signingTitle",
  "signingText",
  "signingStatus",
  "signingSubtext",
  "openSigningWalletBtn",
  "copySigningLinkBtn",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const state = {
  env: "testnet",
  mainnetArmed: false,
  sourceId: "stellar-testnet",
  destId: "base-sepolia",
  speed: "fast",
  useCircleForwarding: true,
  feeBufferPct: 20,
  busy: false,
  connectTarget: "source",
  connectKind: "stellar",
  wcUri: "",
  actionRunId: 0,
  signingRequestId: 0,
  signingRequestCancelled: false,
  stellar: {
    address: "",
    mode: "none",
    wc: null,
    session: null,
    wcUri: "",
    needsVault: false,
  },
  evm: {
    address: "",
    mode: "none",
    chainId: null,
    provider: null,
    wc: null,
    session: null,
    wcUri: "",
  },
  quote: blankQuote(),
  allowance: { status: "idle", allowance6: null, lastUpdated: "" },
  sourceBalance: blankSourceBalance(),
  balanceRequestId: 0,
  flow: blankFlow(),
  pollTimer: null,
  pollCount: 0,
  quoteTimer: null,
  quoteRequestId: 0,
};

const announcedEvmProviders = [];

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", rememberAnnouncedEvmProvider);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function blankQuote() {
  return {
    status: "idle",
    row: null,
    forwardFee6: 0n,
    protocolFee6: 0n,
    estimatedFee6: 0n,
    maxFee6: 0n,
    error: "",
    fetchedAt: "",
  };
}

function blankSourceBalance() {
  return { status: "idle", units: null, error: "", chainId: "", address: "" };
}

function blankFlow() {
  return {
    transferId: makeTransferId(),
    evmApproved: false,
    stellarApproved: false,
    burnSubmitted: false,
    manualReceived: false,
    autoDelivered: false,
    approveTxHash: "",
    burnTxHash: "",
    receiveTxHash: "",
    forwardTxHash: "",
    messageHex: "",
    attestationHex: "",
    attestationReadyAt: 0,
    forwardFailed: false,
    nonce: "",
    statusText: "",
    verified: "unknown",
  };
}

function env() {
  return NETWORKS[state.env];
}

function evmContracts() {
  return EVM_CONTRACTS[state.env];
}

function chains() {
  return [env().stellar, ...env().evm];
}

function sourceChain() {
  return chains().find((chain) => chain.id === state.sourceId) ?? env().stellar;
}

function destChain() {
  return chains().find((chain) => chain.id === state.destId) ?? env().evm[0];
}

function sourceIsStellar() {
  return sourceChain().kind === "stellar";
}

function destIsStellar() {
  return destChain().kind === "stellar";
}

function sourceIsEvm() {
  return sourceChain().kind === "evm";
}

function destIsEvm() {
  return destChain().kind === "evm";
}

function sourceDecimals() {
  return sourceIsStellar() ? DECIMALS_STELLAR : DECIMALS_EVM;
}

function destDecimals() {
  return destIsStellar() ? DECIMALS_STELLAR : DECIMALS_EVM;
}

function amountInputUnits() {
  return parseUnits(el.amountInput.value, sourceDecimals());
}

function amount6() {
  const units = amountInputUnits();
  return sourceIsStellar() ? units / 10n : units;
}

function burnSourceUnits() {
  const six = amount6();
  return sourceIsStellar() ? six * 10n : six;
}

function feeSourceUnits(fee6) {
  return sourceIsStellar() ? fee6 * 10n : fee6;
}

function receiveDestUnits() {
  const receive6 = amount6() > state.quote.estimatedFee6 ? amount6() - state.quote.estimatedFee6 : 0n;
  return destIsStellar() ? receive6 * 10n : receive6;
}

function sourceSignerConnected() {
  if (sourceIsStellar()) return !!state.stellar.address && state.stellar.mode !== "manual";
  return !!state.evm.address && state.evm.mode !== "manual";
}

function destSignerConnected() {
  if (destIsStellar()) return !!state.stellar.address && state.stellar.mode !== "manual";
  return !!state.evm.address && state.evm.mode !== "manual";
}

function destAddressAvailable() {
  return destIsStellar() ? !!state.stellar.address : !!state.evm.address;
}

function recipientValid() {
  const value = clean(el.recipientInput.value);
  return destIsStellar() ? isStellarAddress(value) : isEvmAddress(value);
}

function sameDomainRoute() {
  return sourceChain().domain === destChain().domain;
}

function minFinality() {
  return state.speed === "fast" ? 1000 : 2000;
}

function canUseFast() {
  return !!sourceChain().sourceFast;
}

function usesStellarForwarder() {
  return destIsStellar();
}

function circleForwardingAvailable() {
  const sourceSupported = sourceIsEvm() || (sourceIsStellar() && state.env === "testnet");
  return sourceSupported && destIsEvm() && !!destChain().forwardingDestination && !sameDomainRoute();
}

function autoDeliveryAvailable() {
  return circleForwardingAvailable() && canUseFast();
}

function usesCircleForwarding() {
  return autoDeliveryAvailable() && state.speed === "fast" && state.useCircleForwarding;
}

function autoDeliveryFallbackReady() {
  if (!usesCircleForwarding()) return true;
  if (state.flow.forwardFailed) return true;
  return !!state.flow.attestationReadyAt && Date.now() - state.flow.attestationReadyAt >= AUTO_DELIVERY_GRACE_MS;
}

function autoDeliveryGraceLabel() {
  const remainingMs = Math.max(0, AUTO_DELIVERY_GRACE_MS - (Date.now() - state.flow.attestationReadyAt));
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return minutes ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function needsFeeQuote() {
  return state.speed === "fast" || usesCircleForwarding();
}

function feeQuoteReady() {
  return !needsFeeQuote() || state.quote.status === "ready";
}

function fastAllowanceOk() {
  if (state.speed !== "fast") return true;
  if (!canUseFast()) return false;
  if (state.allowance.status !== "ready") return false;
  return amount6() <= (state.allowance.allowance6 ?? 0n);
}

function mainnetBlocked() {
  return state.env === "mainnet" && !state.mainnetArmed;
}

function routeMode() {
  if (usesCircleForwarding()) return "delivery";
  return state.speed;
}

function setRouteMode(mode) {
  if (mode === "delivery") {
    if (!autoDeliveryAvailable()) {
      toast("info", "Auto-delivery unavailable", "This route does not currently support Circle auto-delivery.");
      return;
    }
    state.speed = "fast";
    state.useCircleForwarding = true;
  } else if (mode === "fast") {
    if (!canUseFast()) {
      toast("info", "Fast unavailable", "This source chain is Standard-only.");
      return;
    }
    state.speed = "fast";
    state.useCircleForwarding = false;
  } else {
    state.speed = "standard";
    state.useCircleForwarding = false;
  }
  stopPolling();
  state.flow = blankFlow();
  scheduleRouteRefresh();
}

function currentAction() {
  if (sameDomainRoute()) {
    return {
      label: "Choose different domains",
      helper: "CCTP routes must move between different Circle domains.",
      disabled: true,
      active: 0,
    };
  }
  if (mainnetBlocked()) {
    return {
      label: "Mainnet locked",
      helper: "Arm mainnet actions before signing transactions with real USDC.",
      disabled: true,
      active: 0,
    };
  }
  if (!sourceSignerConnected()) {
    return {
      label: sourceIsStellar() ? "Connect Stellar source" : "Connect EVM source",
      helper: "Connect a signing wallet for the source chain.",
      fn: () => openConnect("source"),
      active: 0,
    };
  }
  if (burnSourceUnits() <= 0n) {
    return {
      label: "Enter amount",
      helper: "Enter the USDC amount to burn on the source chain.",
      disabled: true,
      active: 0,
    };
  }
  if (amount6() > MAX_BURN_UNITS6) {
    return {
      label: "Amount exceeds CCTP limit",
      helper: "A single CCTP burn cannot exceed 10,000,000 USDC.",
      disabled: true,
      active: 0,
    };
  }
  if (state.sourceBalance.status === "ready" && burnSourceUnits() > (state.sourceBalance.units ?? 0n)) {
    return {
      label: "Insufficient USDC balance",
      helper: `Available balance: ${fmt(state.sourceBalance.units ?? 0n, sourceDecimals())}.`,
      disabled: true,
      active: 0,
    };
  }
  if (!recipientValid()) {
    return {
      label: "Add recipient",
      helper: destIsStellar()
        ? "Paste a valid Stellar G, M, or C recipient."
        : "Paste a valid EVM 0x recipient.",
      disabled: true,
      active: 0,
    };
  }
  if (!canUseFast() && state.speed === "fast") {
    return {
      label: "Use Standard",
      helper: "Fast Transfer is not available from this source chain.",
      disabled: true,
      active: 1,
    };
  }
  if (needsFeeQuote() && state.quote.status !== "ready") {
    return {
      label: "Refresh quote",
      helper: "Fetch Circle fees before approving and burning.",
      fn: refreshQuote,
      active: 1,
    };
  }
  if (state.speed === "fast" && state.allowance.status !== "ready") {
    return {
      label: "Check fast allowance",
      helper: "Check Circle's Fast Transfer allowance before signing.",
      fn: refreshAllowance,
      active: 1,
    };
  }
  if (!fastAllowanceOk()) {
    return {
      label: "Fast allowance too low",
      helper: "Switch to Standard or reduce the amount.",
      disabled: true,
      active: 1,
    };
  }
  if (state.quote.maxFee6 >= amount6() && needsFeeQuote()) {
    return {
      label: "Amount too low for fees",
      helper: "The quoted maxFee is greater than or equal to the burn amount.",
      disabled: true,
      active: 1,
    };
  }
  if (sourceIsEvm()) {
    if (!state.flow.evmApproved) {
      if (state.flow.approveTxHash) {
        return {
          label: "Check approval confirmation",
          helper: `Resume confirmation for ${short(state.flow.approveTxHash)} before sending another approval.`,
          fn: confirmPendingEvmApproval,
          active: 2,
        };
      }
      return {
        label: "Approve EVM USDC",
        helper: `Approve ${fmt(burnSourceUnits(), DECIMALS_EVM)} for TokenMessengerV2.`,
        fn: approveEvm,
        active: 2,
      };
    }
    if (!state.flow.burnSubmitted) {
      if (state.flow.burnTxHash) {
        return {
          label: "Check burn confirmation",
          helper: `Resume confirmation for ${short(state.flow.burnTxHash)} before sending another burn.`,
          fn: confirmPendingEvmBurn,
          active: 3,
        };
      }
      return {
        label: usesCircleForwarding() ? "Burn with auto-delivery" : "Burn EVM USDC",
        helper: burnHelperText(),
        fn: burnEvm,
        active: 3,
      };
    }
  } else {
    if (!state.flow.stellarApproved) {
      return {
        label: "Approve Stellar USDC",
        helper: `Approve ${fmt(burnSourceUnits(), DECIMALS_STELLAR)} for TokenMessengerMinter.`,
        fn: approveStellar,
        active: 2,
      };
    }
    if (!state.flow.burnSubmitted) {
      return {
        label: usesCircleForwarding() ? "Burn with auto-delivery" : "Burn Stellar USDC",
        helper: burnHelperText(),
        fn: burnStellar,
        active: 3,
      };
    }
  }
  if (usesCircleForwarding() && state.flow.autoDelivered) {
    return doneAction();
  }
  if (usesCircleForwarding() && !state.flow.messageHex) {
    return {
      label: "Waiting for Circle",
      helper: state.flow.statusText || "Burn submitted. Waiting for forwardTxHash or attestation.",
      disabled: true,
      active: 4,
    };
  }
  if (!state.flow.messageHex || !state.flow.attestationHex) {
    return {
      label: "Waiting for attestation",
      helper: state.flow.statusText || "Burn submitted. Fetch or wait for Circle attestation.",
      disabled: true,
      active: 4,
    };
  }
  if (usesCircleForwarding() && !state.flow.autoDelivered && !autoDeliveryFallbackReady()) {
    return {
      label: "Auto-delivery in progress",
      helper: `Circle has attested the burn and is completing delivery. Manual recovery unlocks in ${autoDeliveryGraceLabel()}.`,
      disabled: true,
      active: 5,
    };
  }
  if (destIsEvm() && !state.flow.manualReceived && !state.flow.autoDelivered) {
    if (!destSignerConnected()) {
      return {
        label: "Connect EVM receiver",
        helper: "Connect an EVM signing wallet to retry receiveMessage manually.",
        fn: () => openConnect("dest"),
        active: 5,
      };
    }
    if (state.flow.receiveTxHash) {
      return {
        label: "Check receive confirmation",
        helper: `Resume confirmation for ${short(state.flow.receiveTxHash)} before retrying receiveMessage.`,
        fn: confirmPendingEvmReceive,
        active: 5,
      };
    }
    return {
      label: usesCircleForwarding() ? "Recover manually" : `Receive on ${destChain().shortLabel}`,
      helper: usesCircleForwarding()
        ? "Auto-delivery is still unconfirmed. You can keep waiting or submit receiveMessage manually."
        : "Submit receiveMessage(message, attestation) on the destination MessageTransmitter.",
      fn: receiveOnEvm,
      active: 5,
    };
  }
  if (destIsStellar() && !state.flow.manualReceived) {
    if (!destSignerConnected()) {
      return {
        label: "Connect Stellar signer",
        helper: "Connect any Stellar signer to call CctpForwarder.mint_and_forward.",
        fn: () => openConnect("dest"),
        active: 5,
      };
    }
    return {
      label: "Receive on Stellar",
      helper: "Call CctpForwarder.mint_and_forward(message, attestation).",
      fn: receiveOnStellar,
      active: 5,
    };
  }
  return doneAction();
}

function doneAction() {
  return {
    label: "Bridge complete",
    helper: "Transfer complete.",
    disabled: true,
    active: 6,
  };
}

function burnHelperText() {
  if (usesCircleForwarding()) {
    return `Burn ${fmt(burnSourceUnits(), sourceDecimals())}; Circle can deduct up to ${fmt(feeSourceUnits(state.quote.maxFee6), sourceDecimals())}.`;
  }
  if (usesStellarForwarder()) {
    return "Destination is Stellar. The burn will target CctpForwarder with the Stellar recipient in hook data.";
  }
  return "Manual receive will be available after Circle signs the attestation.";
}

function populateChains() {
  const oldSource = state.sourceId;
  const oldDest = state.destId;
  el.sourceChain.innerHTML = "";
  el.destChain.innerHTML = "";
  for (const chain of chains()) {
    for (const select of [el.sourceChain, el.destChain]) {
      const option = document.createElement("option");
      option.value = chain.id;
      option.textContent = chain.label;
      select.appendChild(option);
    }
  }
  state.sourceId = chains().some((chain) => chain.id === oldSource) ? oldSource : env().stellar.id;
  state.destId = chains().some((chain) => chain.id === oldDest) ? oldDest : env().evm[0].id;
  if (state.sourceId === state.destId) {
    state.destId = env().evm.find((chain) => chain.id !== state.sourceId)?.id ?? env().stellar.id;
  }
  el.sourceChain.value = state.sourceId;
  el.destChain.value = state.destId;
}

function updateUi() {
  document.documentElement.classList.toggle("mainnet", state.env === "mainnet");
  el.networkBadge.textContent = state.env === "mainnet" ? "Mainnet guarded" : "Testnet preview";
  el.routeSubtitle.textContent = location.protocol === "file:"
    ? "Route controls work here, but wallet extensions should be tested from http://localhost:4173/."
    : "Choose a route and quote the transfer before signing.";
  el.envOut.textContent = state.env;
  el.mainnetArmedOut.textContent = String(state.mainnetArmed);
  el.testnetBtn.classList.toggle("active", state.env === "testnet");
  el.mainnetBtn.classList.toggle("active", state.env === "mainnet");
  el.armMainnetBtn.textContent = state.mainnetArmed ? "Lock mainnet actions" : "Arm mainnet actions";

  el.sourceChain.value = state.sourceId;
  el.destChain.value = state.destId;
  el.recipientInput.placeholder = destIsStellar() ? "G... / M... / C..." : "0x...";
  el.sourceBalanceOut.textContent = sourceBalanceLabel();
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.disabled = state.sourceBalance.status !== "ready" || (state.sourceBalance.units ?? 0n) <= 0n;
  });
  el.forwardingToggleWrap.disabled = !autoDeliveryAvailable();
  el.forwardingToggleWrap.classList.toggle("unavailable", !autoDeliveryAvailable());
  el.forwardingToggle.checked = state.useCircleForwarding;

  el.sourceWalletTitle.textContent = sourceIsStellar() ? "Connect Stellar source" : "Connect EVM source";
  el.sourceWalletMeta.textContent = sourceIsStellar()
    ? walletMeta(state.stellar)
    : walletMeta(state.evm);
  el.destWalletTitle.textContent = destIsStellar() ? "Connect Stellar receiver" : "Connect EVM receiver";
  el.destWalletMeta.textContent = destIsStellar()
    ? walletMeta(state.stellar, "Optional autofill")
    : walletMeta(state.evm, "Optional autofill");
  el.sourceWalletBtn.classList.toggle("good", sourceSignerConnected());
  el.destWalletBtn.classList.toggle("good", destAddressAvailable());
  el.useConnectedRecipientBtn.disabled = !destAddressAvailable();

  if (state.speed === "fast" && !canUseFast()) state.speed = "standard";
  el.fastBtn.disabled = !canUseFast();
  el.standardBtn.classList.toggle("active", routeMode() === "standard");
  el.fastBtn.classList.toggle("active", routeMode() === "fast");
  el.forwardingToggleWrap.classList.toggle("active", routeMode() === "delivery");
  el.fastMeta.textContent = canUseFast()
    ? "Quick attestation"
    : "Fast is unavailable from this source.";
  el.forwardingToggleWrap.querySelector("span").textContent = autoDeliveryAvailable()
    ? "No receive step"
    : "Unavailable here";

  const routeInfo = getRouteNotice();
  el.routeNotice.className = `notice ${routeInfo.tone}`;
  el.routeNoticeTitle.textContent = routeInfo.title;
  el.routeNoticeText.textContent = routeInfo.text;

  el.quoteStatus.textContent = quoteStatusLabel();
  el.burnAmountOut.textContent = fmt(burnSourceUnits(), sourceDecimals());
  el.receiveAmountOut.textContent = fmt(receiveDestUnits(), destDecimals());
  el.feeEstimateOut.textContent = fmt(feeSourceUnits(state.quote.estimatedFee6), sourceDecimals());
  el.maxFeeOut.textContent = fmt(feeSourceUnits(state.quote.maxFee6), sourceDecimals());
  el.forwardFeeOut.textContent = state.quote.forwardFee6 ? fmt(feeSourceUnits(state.quote.forwardFee6), sourceDecimals()) : "-";
  el.protocolFeeOut.textContent = state.quote.protocolFee6 ? fmt(feeSourceUnits(state.quote.protocolFee6), sourceDecimals()) : "-";
  el.quoteNote.textContent = quoteNote();

  el.stellarConnOut.textContent = state.stellar.address ? `${state.stellar.mode} ${short(state.stellar.address)}` : "Not connected";
  el.evmConnOut.textContent = state.evm.address ? `${state.evm.mode} ${short(state.evm.address)}` : "Not connected";
  el.vaultModeOut.textContent = state.stellar.needsVault ? "Likely required" : state.stellar.address ? "Not detected" : "Unknown";
  el.sourceDomainOut.textContent = String(sourceChain().domain);
  el.destDomainOut.textContent = String(destChain().domain);
  el.deliveryOut.textContent = deliveryLabel();
  el.allowanceOut.textContent = allowanceLabel();
  el.routeModelNote.textContent = routeModelNote();
  el.tokenMessengerOut.textContent = sourceIsStellar()
    ? short(env().stellar.tokenMessengerMinter)
    : short(evmContracts().tokenMessenger);
  el.messageTransmitterOut.textContent = destIsStellar()
    ? short(env().stellar.messageTransmitter)
    : short(evmContracts().messageTransmitter);
  el.forwarderOut.textContent = short(env().stellar.cctpForwarder);
  el.usdcOut.textContent = sourceIsStellar() ? short(env().stellar.usdcContract) : short(sourceChain().usdc);

  const action = currentAction();
  el.mainActionBtn.textContent = state.busy ? "Working..." : action.label;
  el.mainActionBtn.disabled = state.busy || !!action.disabled;
  el.mainHelper.textContent = action.helper;
  updateTimeline(action.active);
  updateSuccess();
}

function walletMeta(wallet, fallback = "Required") {
  if (!wallet.address) return fallback;
  return `${wallet.mode} ${short(wallet.address)}`;
}

function sourceWalletAddress() {
  return sourceIsStellar() ? state.stellar.address : state.evm.address;
}

function sourceBalanceLabel() {
  if (!sourceWalletAddress()) return "Connect wallet";
  if (state.sourceBalance.status === "fetching") return "Loading...";
  if (state.sourceBalance.status === "ready") {
    return `${editableAmount(state.sourceBalance.units ?? 0n, sourceDecimals())} USDC`;
  }
  if (state.sourceBalance.status === "error") return "Unavailable";
  return "Refresh pending";
}

function resetSourceBalance() {
  state.balanceRequestId += 1;
  state.sourceBalance = blankSourceBalance();
}

async function refreshSourceBalance({ silent = true } = {}) {
  const address = sourceWalletAddress();
  const chain = sourceChain();
  const requestId = ++state.balanceRequestId;
  if (!address) {
    state.sourceBalance = blankSourceBalance();
    updateUi();
    return;
  }
  state.sourceBalance = {
    status: "fetching",
    units: null,
    error: "",
    chainId: chain.id,
    address,
  };
  updateUi();
  try {
    const units = chain.kind === "stellar"
      ? await fetchStellarUsdcBalance(address)
      : await fetchEvmUsdcBalance(chain, address);
    if (requestId !== state.balanceRequestId) return;
    state.sourceBalance = {
      status: "ready",
      units,
      error: "",
      chainId: chain.id,
      address,
    };
  } catch (error) {
    if (requestId !== state.balanceRequestId) return;
    state.sourceBalance = {
      status: "error",
      units: null,
      error: errorMessage(error),
      chainId: chain.id,
      address,
    };
    log("Balance read failed", state.sourceBalance.error);
    if (!silent) toast("err", "Balance unavailable", state.sourceBalance.error, 7000);
  } finally {
    if (requestId === state.balanceRequestId) updateUi();
  }
}

async function fetchStellarUsdcBalance(address) {
  const response = await fetch(`${env().stellar.horizonUrl}/accounts/${encodeURIComponent(address)}`);
  if (!response.ok) throw new Error(response.status === 404 ? "Stellar account was not found." : `Stellar balance request failed (${response.status}).`);
  const account = await response.json();
  const balance = (account.balances ?? []).find((entry) =>
    entry.asset_code === "USDC" && entry.asset_issuer === env().stellar.usdcIssuer
  );
  return parseUnits(balance?.balance ?? "0", DECIMALS_STELLAR);
}

async function fetchEvmUsdcBalance(chain, address) {
  const { encodeFunctionData, parseAbi } = await loadViem();
  const data = encodeFunctionData({
    abi: parseAbi(["function balanceOf(address account) view returns (uint256)"]),
    functionName: "balanceOf",
    args: [address],
  });
  const result = await publicEvmRpc(chain, "eth_call", [{ to: chain.usdc, data }, "latest"]);
  return result ? BigInt(result) : 0n;
}

function setBalancePreset(preset) {
  const balance = state.sourceBalance.units;
  if (state.sourceBalance.status !== "ready" || balance === null) {
    refreshSourceBalance({ silent: false });
    return;
  }
  const percent = preset === "max" ? 100n : BigInt(preset);
  let units = (balance * percent) / 100n;
  if (sourceIsStellar()) units = (units / 10n) * 10n;
  el.amountInput.value = editableAmount(units, sourceDecimals());
  handleTransferInputChange();
}

function getRouteNotice() {
  if (sameDomainRoute()) {
    return {
      tone: "bad",
      title: "Invalid route",
      text: "Source and destination must be different CCTP domains.",
    };
  }
  if (usesStellarForwarder()) {
    return {
      tone: "warn",
      title: "Stellar destination requires CctpForwarder",
      text: "The burn sets both mintRecipient and destinationCaller to CctpForwarder, with the final Stellar recipient encoded in hook data.",
    };
  }
  if (usesCircleForwarding()) {
    return {
      tone: "good",
      title: "Circle Forwarding Service route",
      text: "The burn uses the cctp-forward hook. After attestation, Circle gets an uninterrupted delivery window before manual recovery is offered.",
    };
  }
  return {
    tone: "warn",
    title: "Manual receive route",
    text: "Circle signs the attestation, then a signer submits receiveMessage on the destination chain.",
  };
}

function quoteStatusLabel() {
  if (!needsFeeQuote()) return "No fee quote required";
  if (state.quote.status === "ready") return `Quoted ${state.quote.fetchedAt}`;
  if (state.quote.status === "fetching") return "Fetching...";
  if (state.quote.status === "error") return "Quote failed";
  return "Not quoted";
}

function quoteNote() {
  const six = amount6();
  if (sourceIsStellar() && amountInputUnits() !== burnSourceUnits()) {
    return "Stellar burns only through the sixth decimal for CCTP. Any seventh decimal dust stays in the source account.";
  }
  if (needsFeeQuote() && state.quote.status !== "ready") {
    return state.quote.error || "Refresh the quote immediately before signing.";
  }
  if (usesCircleForwarding()) {
    return `You send ${fmt(burnSourceUnits(), sourceDecimals())}. Estimated receive is ${fmt(receiveDestUnits(), destDecimals())}; maxFee includes a ${state.feeBufferPct}% buffer.`;
  }
  if (state.speed === "fast") {
    return `Fast Transfer fee is deducted on mint. Estimated receive is ${fmt(receiveDestUnits(), destDecimals())}.`;
  }
  if (six > 0n) return "Standard Transfer uses hard finality and generally has no CCTP protocol fee.";
  return "Enter an amount to calculate the route.";
}

function deliveryLabel() {
  if (usesCircleForwarding()) return "Circle auto-delivery";
  if (usesStellarForwarder()) return "Stellar CctpForwarder";
  return "Manual receive";
}

function allowanceLabel() {
  if (state.speed !== "fast") return "Not needed";
  if (state.allowance.status === "ready") return `${fmt(state.allowance.allowance6 ?? 0n, DECIMALS_EVM)} left`;
  if (state.allowance.status === "fetching") return "Checking...";
  if (state.allowance.status === "error") return "Failed";
  return "Not checked";
}

function routeModelNote() {
  if (destIsStellar()) {
    return "Stellar address type is preserved by CctpForwarder hook data. Never mint directly to a user G or M address.";
  }
  if (usesCircleForwarding()) {
    return "Manual recovery stays hidden while Circle is completing a normal auto-delivery.";
  }
  return "The app keeps the message and attestation available so a failed mint can be retried safely.";
}

function updateTimeline(activeIndex) {
  const items = [
    {
      title: "Setup",
      text: sourceSignerConnected() && recipientValid() ? "Source signer and recipient ready" : "Connect source and add recipient",
      done: sourceSignerConnected() && burnSourceUnits() > 0n && recipientValid(),
    },
    {
      title: "Quote and allowance",
      text: feeQuoteReady() && fastAllowanceOk() ? "Route checks ready" : "Fetch fees and allowance",
      done: feeQuoteReady() && fastAllowanceOk(),
      warn: state.quote.status === "error" || state.allowance.status === "error",
    },
    {
      title: "Approve",
      text: sourceIsStellar()
        ? state.flow.stellarApproved ? "Stellar USDC approved" : "Approve TokenMessengerMinter"
        : state.flow.evmApproved ? "EVM USDC approved" : "Approve TokenMessengerV2",
      done: sourceIsStellar() ? state.flow.stellarApproved : state.flow.evmApproved,
    },
    {
      title: "Burn",
      text: state.flow.burnSubmitted ? "Burn submitted" : "Burn source USDC",
      done: state.flow.burnSubmitted,
    },
    {
      title: usesCircleForwarding() ? "Forward or attest" : "Attestation",
      text: state.flow.autoDelivered
        ? "Forward transaction detected"
        : state.flow.messageHex && state.flow.attestationHex
          ? "Attestation ready"
          : state.flow.statusText || "Waiting for Circle",
      done: state.flow.autoDelivered || !!(state.flow.messageHex && state.flow.attestationHex),
      warn: state.flow.burnSubmitted && !state.flow.messageHex && state.flow.statusText,
    },
    {
      title: "Receive",
      text: state.flow.autoDelivered
        ? "Auto-delivered"
        : state.flow.manualReceived
          ? "Manual receive complete"
          : state.flow.messageHex && usesCircleForwarding() && !autoDeliveryFallbackReady()
            ? "Auto-delivery in progress"
            : state.flow.messageHex
              ? usesCircleForwarding() ? "Manual recovery available" : "Manual receive available"
            : "Waiting",
      done: state.flow.autoDelivered || state.flow.manualReceived,
    },
  ];

  el.timeline.innerHTML = items
    .map((item, index) => {
      const cls = item.done ? "done" : item.warn ? "warn" : index === activeIndex ? "active" : "";
      const mark = item.done ? "ok" : String(index + 1);
      return `<div class="step ${cls}"><div class="step-mark">${esc(mark)}</div><div><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div></div>`;
    })
    .join("");
}

function updateSuccess() {
  const complete = state.flow.autoDelivered || state.flow.manualReceived;
  el.successPanel.classList.toggle("open", complete);
  el.successText.textContent = state.flow.autoDelivered
    ? "Circle Forwarding Service delivery was detected with a destination transaction hash."
    : "Manual receive completed.";
  el.successApproveTx.innerHTML = txLink(state.flow.approveTxHash, sourceChain());
  el.successBurnTx.innerHTML = txLink(state.flow.burnTxHash, sourceChain());
  el.successReceiveTx.innerHTML = txLink(state.flow.forwardTxHash || state.flow.receiveTxHash, destChain());
}

function cancelScheduledRouteRefresh() {
  if (state.quoteTimer) {
    clearTimeout(state.quoteTimer);
    state.quoteTimer = null;
  }
}

function resetRouteChecks() {
  cancelScheduledRouteRefresh();
  state.quoteRequestId += 1;
  state.quote = blankQuote();
  state.allowance = { status: "idle", allowance6: null, lastUpdated: "" };
}

function scheduleRouteRefresh() {
  resetRouteChecks();
  updateUi();
  if (amount6() <= 0n || sameDomainRoute()) return;
  const requestId = state.quoteRequestId;
  state.quoteTimer = setTimeout(() => {
    autoRefreshRouteChecks(requestId);
  }, 300);
}

async function autoRefreshRouteChecks(requestId) {
  if (requestId !== state.quoteRequestId) return;
  if (needsFeeQuote()) {
    await refreshQuote({ silent: true, requestId });
  } else if (requestId === state.quoteRequestId) {
    state.quote.status = "ready";
    updateUi();
  }
  if (requestId === state.quoteRequestId && state.speed === "fast") {
    await refreshAllowance({ silent: true, requestId });
  }
}

async function refreshQuote({ silent = false, requestId = ++state.quoteRequestId } = {}) {
  state.quote = blankQuote();
  if (!needsFeeQuote()) {
    if (requestId !== state.quoteRequestId) return;
    state.quote.status = "ready";
    updateUi();
    return;
  }
  if (amount6() <= 0n) {
    if (requestId !== state.quoteRequestId) return;
    state.quote.status = "idle";
    if (!silent) toast("info", "Amount needed", "Enter an amount before quoting fees.");
    updateUi();
    return;
  }
  state.quote.status = "fetching";
  updateUi();
  try {
    const forward = usesCircleForwarding() ? "?forward=true" : "";
    const url = `${env().irisApiUrl}/v2/burn/USDC/fees/${sourceChain().domain}/${destChain().domain}${forward}`;
    const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const json = await response.json();
    log("Fee response", json);
    if (!response.ok) throw new Error(json?.message || `Circle fee API ${response.status}`);
    const rows = Array.isArray(json) ? json : Object.values(json?.fees ?? json?.data ?? {});
    const row = rows.find((candidate) => Number(candidate.finalityThreshold ?? candidate.finality_threshold) === minFinality()) ?? rows[0];
    if (!row) throw new Error("Circle returned no fee rows for this route.");
    if (requestId !== state.quoteRequestId) return;
    const forwardFee = usesCircleForwarding() ? pickForwardFee(row.forwardFee ?? row.forward_fee ?? {}) : 0n;
    const protocolFee = state.speed === "fast" ? calculateProtocolFee(amount6(), row.minimumFee ?? row.minimum_fee ?? 0) : 0n;
    const estimatedFee = forwardFee + protocolFee;
    state.quote = {
      status: "ready",
      row,
      forwardFee6: forwardFee,
      protocolFee6: protocolFee,
      estimatedFee6: estimatedFee,
      maxFee6: applyBuffer(estimatedFee, state.feeBufferPct),
      error: "",
      fetchedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    if (!silent) toast("ok", "Quote ready", `Estimated receive ${fmt(receiveDestUnits(), destDecimals())}`);
  } catch (error) {
    if (requestId !== state.quoteRequestId) return;
    state.quote.status = "error";
    state.quote.error = errorMessage(error);
    if (!silent) toast("err", "Quote failed", state.quote.error, 7000);
  } finally {
    if (requestId === state.quoteRequestId) updateUi();
  }
}

async function refreshAllowance({ silent = false, requestId = ++state.quoteRequestId } = {}) {
  if (state.speed !== "fast") {
    if (requestId !== state.quoteRequestId) return;
    state.allowance = { status: "idle", allowance6: null, lastUpdated: "" };
    updateUi();
    return;
  }
  state.allowance.status = "fetching";
  updateUi();
  try {
    const response = await fetch(`${env().irisApiUrl}/v2/fastBurn/USDC/allowance`);
    const json = await response.json();
    log("Fast allowance response", json);
    if (!response.ok) throw new Error(json?.message || `Circle allowance API ${response.status}`);
    if (requestId !== state.quoteRequestId) return;
    state.allowance = {
      status: "ready",
      allowance6: parseUnits(String(json.allowance ?? "0"), DECIMALS_EVM),
      lastUpdated: json.lastUpdated ?? "",
    };
    if (!silent) toast("ok", "Fast allowance checked", allowanceLabel());
  } catch (error) {
    if (requestId !== state.quoteRequestId) return;
    state.allowance.status = "error";
    if (!silent) toast("err", "Allowance check failed", errorMessage(error), 7000);
  } finally {
    if (requestId === state.quoteRequestId) updateUi();
  }
}

async function confirmPendingEvmApproval() {
  try {
    await waitForEvmReceipt(state.flow.approveTxHash, sourceChain(), "USDC approval");
  } catch (error) {
    if (transactionReverted(error)) state.flow.approveTxHash = "";
    throw error;
  }
  state.flow.evmApproved = true;
  toast("ok", "EVM approval confirmed", short(state.flow.approveTxHash));
}

async function confirmPendingEvmBurn() {
  try {
    await waitForEvmReceipt(state.flow.burnTxHash, sourceChain(), "USDC burn");
  } catch (error) {
    if (transactionReverted(error)) {
      state.flow.burnTxHash = "";
      el.burnHashInput.value = "";
    }
    throw error;
  }
  markBurnSubmitted(state.flow.burnTxHash);
  refreshSourceBalance();
  toast("ok", "Burn confirmed", "Waiting for Circle.");
}

async function confirmPendingEvmReceive() {
  try {
    await waitForEvmReceipt(state.flow.receiveTxHash, destChain(), "USDC receive");
  } catch (error) {
    if (transactionReverted(error)) state.flow.receiveTxHash = "";
    throw error;
  }
  state.flow.manualReceived = true;
  toast("ok", "Manual receive confirmed", short(state.flow.receiveTxHash));
}

async function approveEvm() {
  const { encodeFunctionData, parseAbi } = await loadViem();
  await switchEvm(sourceChain());
  const data = encodeFunctionData({
    abi: parseAbi(["function approve(address spender,uint256 amount) returns (bool)"]),
    functionName: "approve",
    args: [evmContracts().tokenMessenger, burnSourceUnits()],
  });
  const txHash = await evmSend({ from: state.evm.address, to: sourceChain().usdc, data });
  state.flow.approveTxHash = txHash;
  toast("info", "Approval submitted", "Waiting for source-chain confirmation.");
  try {
    await waitForEvmReceipt(txHash, sourceChain(), "USDC approval");
  } catch (error) {
    if (transactionReverted(error)) state.flow.approveTxHash = "";
    throw error;
  }
  state.flow.evmApproved = true;
  toast("ok", "EVM approval confirmed", short(txHash));
}

async function burnEvm() {
  const { encodeFunctionData, parseAbi } = await loadViem();
  await switchEvm(sourceChain());
  const { mintRecipient, destinationCaller, hookData } = await evmBurnDestination();
  const data = encodeFunctionData({
    abi: parseAbi([
      "function depositForBurnWithHook(uint256 amount,uint32 destinationDomain,bytes32 mintRecipient,address burnToken,bytes32 destinationCaller,uint256 maxFee,uint32 minFinalityThreshold,bytes hookData) returns (uint64)",
    ]),
    functionName: "depositForBurnWithHook",
    args: [
      burnSourceUnits(),
      destChain().domain,
      mintRecipient,
      sourceChain().usdc,
      destinationCaller,
      state.quote.maxFee6,
      minFinality(),
      hookData,
    ],
  });
  const txHash = await evmSend({ from: state.evm.address, to: evmContracts().tokenMessenger, data });
  state.flow.burnTxHash = txHash;
  el.burnHashInput.value = txHash;
  toast("info", "Burn submitted", "Waiting for source-chain confirmation.");
  try {
    await waitForEvmReceipt(txHash, sourceChain(), "USDC burn");
  } catch (error) {
    if (transactionReverted(error)) {
      state.flow.burnTxHash = "";
      el.burnHashInput.value = "";
    }
    throw error;
  }
  markBurnSubmitted(txHash);
  refreshSourceBalance();
  toast("ok", "Burn confirmed", usesCircleForwarding() ? "Waiting for Circle delivery." : "Waiting for attestation.");
}

async function evmBurnDestination() {
  if (destIsStellar()) {
    await loadStellarSdk();
    const forwarder = contractStrkeyToBytes32Hex(env().stellar.cctpForwarder);
    return {
      mintRecipient: forwarder,
      destinationCaller: forwarder,
      hookData: buildStellarForwarderHookData(clean(el.recipientInput.value)),
    };
  }
  return {
    mintRecipient: evmAddressToBytes32Hex(clean(el.recipientInput.value)),
    destinationCaller: ZERO_BYTES32_HEX,
    hookData: usesCircleForwarding() ? CIRCLE_FORWARD_HOOK : "0x",
  };
}

async function approveStellar() {
  const StellarSdk = await loadStellarSdk();
  const server = getSorobanServer();
  const latest = await server.getLatestLedger();
  const args = [
    new StellarSdk.Address(state.stellar.address).toScVal(),
    new StellarSdk.Address(env().stellar.tokenMessengerMinter).toScVal(),
    StellarSdk.nativeToScVal(burnSourceUnits(), { type: "i128" }),
    StellarSdk.nativeToScVal(latest.sequence + 100000, { type: "u32" }),
  ];
  const xdr = await buildContractXdr(env().stellar.usdcContract, "approve", args);
  const signedXdr = await signStellarXdr(xdr);
  const txHash = await submitStellarXdr(signedXdr);
  state.flow.approveTxHash = txHash;
  state.flow.stellarApproved = true;
  toast("ok", "Stellar approval confirmed", short(txHash));
}

async function burnStellar() {
  const StellarSdk = await loadStellarSdk();
  const destination = stellarBurnDestination();
  const args = [
    new StellarSdk.Address(state.stellar.address).toScVal(),
    StellarSdk.nativeToScVal(burnSourceUnits(), { type: "i128" }),
    StellarSdk.nativeToScVal(destChain().domain, { type: "u32" }),
    StellarSdk.xdr.ScVal.scvBytes(destination.mintRecipient),
    new StellarSdk.Address(env().stellar.usdcContract).toScVal(),
    StellarSdk.xdr.ScVal.scvBytes(destination.destinationCaller),
    StellarSdk.nativeToScVal(feeSourceUnits(state.quote.maxFee6), { type: "i128" }),
    StellarSdk.nativeToScVal(minFinality(), { type: "u32" }),
  ];
  const method = destination.hookData ? "deposit_for_burn_with_hook" : "deposit_for_burn";
  if (destination.hookData) args.push(StellarSdk.xdr.ScVal.scvBytes(hexToBytesLocal(destination.hookData)));
  const xdr = await buildContractXdr(env().stellar.tokenMessengerMinter, method, args, "2000000");
  const signedXdr = await signStellarXdr(xdr);
  const txHash = await submitStellarXdr(signedXdr);
  markBurnSubmitted(txHash);
  refreshSourceBalance();
  toast("ok", "Stellar burn confirmed", "Waiting for Circle.");
}

function stellarBurnDestination() {
  if (destIsEvm()) {
    return {
      mintRecipient: bytes32FromHexAddress(clean(el.recipientInput.value)),
      destinationCaller: ZERO_BYTES32,
      hookData: usesCircleForwarding() ? CIRCLE_FORWARD_HOOK : "",
    };
  }
  throw new Error("Stellar destination from Stellar source is not a CCTP route.");
}

async function receiveOnEvm() {
  const { encodeFunctionData, parseAbi } = await loadViem();
  if (!state.flow.messageHex || !state.flow.attestationHex) throw new Error("No message and attestation available.");
  await switchEvm(destChain());
  const data = encodeFunctionData({
    abi: parseAbi(["function receiveMessage(bytes message, bytes attestation) returns (bool)"]),
    functionName: "receiveMessage",
    args: [state.flow.messageHex, state.flow.attestationHex],
  });
  const txHash = await evmSend({ from: state.evm.address, to: evmContracts().messageTransmitter, data });
  state.flow.receiveTxHash = txHash;
  toast("info", "Receive submitted", "Waiting for destination-chain confirmation.");
  try {
    await waitForEvmReceipt(txHash, destChain(), "USDC receive");
  } catch (error) {
    if (transactionReverted(error)) state.flow.receiveTxHash = "";
    throw error;
  }
  state.flow.manualReceived = true;
  toast("ok", "Manual receive confirmed", short(txHash));
}

async function receiveOnStellar() {
  const StellarSdk = await loadStellarSdk();
  if (!state.flow.messageHex || !state.flow.attestationHex) throw new Error("No message and attestation available.");
  const args = [
    StellarSdk.xdr.ScVal.scvBytes(hexToBytesLocal(state.flow.messageHex)),
    StellarSdk.xdr.ScVal.scvBytes(hexToBytesLocal(state.flow.attestationHex)),
  ];
  const xdr = await buildContractXdr(env().stellar.cctpForwarder, "mint_and_forward", args, "3000000");
  const signedXdr = await signStellarXdr(xdr);
  const txHash = await submitStellarXdr(signedXdr);
  state.flow.receiveTxHash = txHash;
  state.flow.manualReceived = true;
  toast("ok", "Received on Stellar", short(txHash));
}

function markBurnSubmitted(txHash) {
  state.flow.burnTxHash = txHash;
  state.flow.burnSubmitted = true;
  el.burnHashInput.value = txHash;
  startPolling();
}

async function fetchMessage({ silent = false } = {}) {
  const txHash = clean(el.burnHashInput.value || state.flow.burnTxHash);
  if (!txHash) throw new Error("Enter a burn transaction hash.");
  const url = `${env().irisApiUrl}/v2/messages/${sourceChain().domain}?transactionHash=${encodeURIComponent(txHash)}`;
  const response = await fetch(url);
  const json = await response.json();
  log("Iris response", json);
  if (response.status === 404) {
    state.flow.statusText = "Circle has not indexed this burn yet.";
    if (!silent) toast("info", "Not indexed yet", state.flow.statusText);
    updateUi();
    return false;
  }
  if (!response.ok) throw new Error(json?.message || `Iris messages API ${response.status}`);
  const item = json?.messages?.[0] ?? json?.message ?? json?.[0];
  if (!item) {
    state.flow.statusText = "Circle has not indexed this burn yet.";
    if (!silent) toast("info", "Not indexed yet", state.flow.statusText);
    updateUi();
    return false;
  }
  const forwardTxHash =
    item.forwardTxHash ??
    item.forward_tx_hash ??
    item.forwardingTxHash ??
    item.destinationTxHash ??
    item.destination_tx_hash ??
    "";
  const forwardState = String(item.forwardState ?? item.forward_state ?? "").toUpperCase();
  let forwardFailed = state.flow.forwardFailed || ["FAILED", "REVERTED"].includes(forwardState);
  state.flow.nonce = String(item.eventNonce ?? item.nonce ?? item.decodedMessage?.nonce ?? "");
  el.nonceInput.value = state.flow.nonce;
  if (forwardTxHash) {
    state.flow.forwardTxHash = forwardTxHash;
    let receipt = null;
    try {
      receipt = await getEvmReceipt(forwardTxHash, destChain());
    } catch (error) {
      log("Forward receipt check failed", errorMessage(error));
    }
    if (!receipt) {
      state.flow.statusText = `Circle forward transaction submitted${forwardState ? ` (${forwardState})` : ""}; waiting for destination confirmation.`;
      updateUi();
      return false;
    }
    if (!receiptSucceeded(receipt)) {
      forwardFailed = true;
      state.flow.forwardFailed = true;
      state.flow.statusText = "Circle forward transaction reverted. Manual recovery may be required.";
    } else {
      state.flow.autoDelivered = true;
      state.flow.statusText = "Circle forward transaction confirmed on the destination chain.";
      toast("ok", "Auto-delivered", short(forwardTxHash));
      updateUi();
      stopPolling();
      return true;
    }
  }
  const message = item.message && item.message !== "0x" ? item.message : item.messageBytes;
  const attestation = item.attestation;
  if (message && attestation && attestation !== "PENDING") {
    state.flow.messageHex = normalizeHex(message);
    state.flow.attestationHex = normalizeHex(attestation);
    state.flow.attestationReadyAt ||= Date.now();
    state.flow.forwardFailed = forwardFailed;
    state.flow.statusText = forwardFailed
      ? "Circle forwarding failed. The attestation is ready for manual receive recovery."
      : usesCircleForwarding()
        ? autoDeliveryFallbackReady()
          ? "Auto-delivery is still unconfirmed. Manual recovery is now available."
          : "Attestation ready. Circle auto-delivery is in progress."
      : "Attestation ready.";
    el.messageText.value = state.flow.messageHex;
    el.attestationText.value = state.flow.attestationHex;
    if (!silent) {
      toast(
        "ok",
        "Attestation ready",
        usesCircleForwarding() && !autoDeliveryFallbackReady()
          ? "Circle is completing auto-delivery."
          : "Manual receive is available."
      );
    }
    updateUi();
    return true;
  }
  state.flow.statusText =
    item.delayReason ? `Delay: ${item.delayReason}` : item.status ? `Circle status: ${item.status}` : "Waiting for Circle...";
  if (!silent) toast("info", "Not ready", state.flow.statusText);
  updateUi();
  return false;
}

function startPolling() {
  stopPolling();
  state.pollCount = 0;
  pollMessage();
}

function stopPolling() {
  if (state.pollTimer) {
    clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }
}

async function pollMessage() {
  if (state.flow.autoDelivered || state.flow.manualReceived) return stopPolling();
  if (state.pollCount >= 360) {
    state.flow.statusText = "Polling paused. Resume from Advanced when ready.";
    updateUi();
    return stopPolling();
  }
  state.pollCount += 1;
  try {
    await fetchMessage({ silent: true });
  } catch (error) {
    state.flow.statusText = errorMessage(error);
    log("Polling error", state.flow.statusText);
    updateUi();
  }
  if (!state.flow.autoDelivered && !state.flow.manualReceived) {
    state.pollTimer = setTimeout(pollMessage, 10000);
  }
}

async function verifyAttestation() {
  const { bytesToHex, hexToBytes, keccak256, recoverAddress } = await loadViem();
  const message = state.flow.messageHex || normalizeHex(el.messageText.value);
  const attestation = state.flow.attestationHex || normalizeHex(el.attestationText.value);
  if (!message || !attestation) throw new Error("Message and attestation are required.");
  const response = await fetch(`${env().irisApiUrl}/v2/publicKeys`);
  const json = await response.json();
  log("Public keys response", json);
  if (!response.ok) throw new Error(json?.message || `Public keys API ${response.status}`);
  const keys = (json.publicKeys ?? [])
    .filter((key) => Number(key.cctpVersion) === 2)
    .map((key) => key.publicKey)
    .filter(Boolean);
  if (!keys.length) throw new Error("No CCTP V2 public keys returned.");
  const hash = keccak256(message);
  const bytes = hexToBytes(attestation);
  if (bytes.length % 65 !== 0) throw new Error(`Invalid attestation length: ${bytes.length}`);
  let valid = 0;
  for (let offset = 0; offset < bytes.length; offset += 65) {
    const sig = bytesToHex(bytes.slice(offset, offset + 65));
    const recovered = (await recoverAddress({ hash, signature: sig })).toLowerCase();
    if (keys.some((key) => publicKeyToAddress(key, keccak256, hexToBytes).toLowerCase() === recovered)) valid += 1;
  }
  const threshold = Math.ceil(keys.length / 2);
  state.flow.verified = valid >= threshold ? "valid" : "invalid";
  toast(state.flow.verified === "valid" ? "ok" : "err", "Attestation verification", `${valid} valid signature(s), threshold ${threshold}.`);
}

async function reattest() {
  const nonce = clean(el.nonceInput.value || state.flow.nonce);
  if (!nonce) throw new Error("Enter a nonce to re-attest.");
  const response = await fetch(`${env().irisApiUrl}/v2/reattest/${encodeURIComponent(nonce)}`, { method: "POST" });
  const json = await response.json();
  log("Re-attest response", json);
  if (!response.ok) throw new Error(json?.message || `Re-attest API ${response.status}`);
  toast("ok", "Re-attestation requested", json.message || `Nonce ${nonce}`);
  startPolling();
}

function usePastedAttestation() {
  const message = normalizeHex(el.messageText.value);
  const attestation = normalizeHex(el.attestationText.value);
  if (!message || !attestation) {
    toast("err", "Missing data", "Paste both message and attestation.");
    return;
  }
  state.flow.messageHex = message;
  state.flow.attestationHex = attestation;
  state.flow.statusText = "Using pasted message and attestation.";
  toast("ok", "Attestation loaded", "Manual receive is available.");
  updateUi();
}

async function runMain() {
  const action = currentAction();
  if (!action.fn) return;
  const runId = ++state.actionRunId;
  state.busy = true;
  updateUi();
  try {
    await action.fn();
  } catch (error) {
    if (runId !== state.actionRunId) return;
    closeModals();
    const message = errorMessage(error);
    state.flow.statusText = message;
    if (!isCancelledWalletRequest(error)) toast("err", "Action failed", message, 8000);
    log("Action failed", message);
  } finally {
    if (runId === state.actionRunId) {
      state.busy = false;
      updateUi();
    }
  }
}

async function runAdvanced(fn) {
  const runId = ++state.actionRunId;
  state.busy = true;
  updateUi();
  try {
    await fn();
  } catch (error) {
    if (runId !== state.actionRunId) return;
    if (!isCancelledWalletRequest(error)) toast("err", "Advanced action failed", errorMessage(error), 8000);
  } finally {
    if (runId === state.actionRunId) {
      state.busy = false;
      updateUi();
    }
  }
}

async function runWalletAction(fn) {
  const runId = ++state.actionRunId;
  state.busy = true;
  updateUi();
  try {
    await fn();
  } catch (error) {
    if (runId !== state.actionRunId) return;
    const message = errorMessage(error);
    if (!isCancelledWalletRequest(error)) toast("err", "Wallet connection failed", message, 10000);
    log("Wallet connection failed", message);
  } finally {
    if (runId === state.actionRunId) {
      state.busy = false;
      updateUi();
    }
  }
}

function openConnect(target) {
  state.connectTarget = target;
  state.connectKind = target === "source" ? sourceChain().kind : destChain().kind;
  el.connectTitle.textContent = state.connectKind === "stellar" ? "Connect Stellar wallet" : "Connect EVM wallet";
  el.connectSubtitle.textContent = state.connectKind === "stellar"
    ? "Use Freighter extension for Stellar source signing. WalletConnect support depends on the mobile wallet."
    : "Use a browser extension on desktop, or WalletConnect for mobile wallets.";
  el.qrArea.classList.remove("open");
  el.manualArea.classList.remove("open");
  renderConnectOptions();
  showModal("connectModal");
}

function renderConnectOptions() {
  const kind = state.connectKind;
  const options = [];
  if (kind === "stellar") {
    options.push(["Freighter extension", "Best for Soroban approvals and burns.", connectFreighter]);
    options.push(["WalletConnect", "Mobile wallets; must support Soroban transaction XDR.", connectStellarWalletConnect]);
    options.push(["Manual address", "Autofill only. Cannot sign transactions.", () => showManualAddress("Stellar address", "G... / M... / C...")]);
  } else {
    const hasInjectedProvider = !!getInjectedProvider();
    options.push(["Browser extension", hasInjectedProvider ? "MetaMask, Rabby, Coinbase Wallet, or another injected wallet." : "Desktop extension. We will wait for provider injection.", connectEvmInjected]);
    options.push(["WalletConnect", "MetaMask and compatible mobile wallets.", connectEvmWalletConnect]);
    options.push(["Manual address", "Autofill only. Cannot sign transactions.", () => showManualAddress("EVM address", "0x...")]);
  }
  el.connectOptions.innerHTML = "";
  for (const [title, subtitle, fn] of options) {
    const button = document.createElement("button");
    button.className = "connect-option";
    button.type = "button";
    button.innerHTML = `<strong>${esc(title)}</strong><span>${esc(subtitle)}</span>`;
    button.onclick = () => runWalletAction(fn);
    el.connectOptions.appendChild(button);
  }
}

function showManualAddress(label, placeholder) {
  el.manualLabel.textContent = label;
  el.manualAddressInput.placeholder = placeholder;
  el.manualAddressInput.value = "";
  el.manualArea.classList.add("open");
}

function useManualAddress() {
  const address = clean(el.manualAddressInput.value);
  if (state.connectKind === "stellar") {
    if (!isStellarAddress(address)) return toast("err", "Invalid Stellar address", "Enter a valid G, M, or C address.");
    state.stellar.address = address;
    state.stellar.mode = "manual";
    detectVaultOrMultisig(address);
  } else {
    if (!isEvmAddress(address)) return toast("err", "Invalid EVM address", "Enter a valid 0x address.");
    state.evm.address = address;
    state.evm.mode = "manual";
  }
  autoFillRecipient();
  closeModals();
  refreshSourceBalance();
  updateUi();
}

async function connectFreighter() {
  const StellarSdk = await loadStellarSdk();
  const module = await import("https://esm.sh/@stellar/freighter-api@5.0.0");
  const api = module.default ?? module;
  let address = "";
  if (api.requestAccess) {
    const result = await api.requestAccess();
    address = result?.address ?? result ?? "";
  }
  if (!address && api.getAddress) {
    const result = await api.getAddress();
    address = result?.address ?? "";
  }
  if (!address && api.getPublicKey) address = await api.getPublicKey();
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) throw new Error("Could not get a Freighter public key.");
  state.stellar.address = address;
  state.stellar.mode = "freighter";
  await detectVaultOrMultisig(address);
  autoFillRecipient();
  closeModals();
  refreshSourceBalance();
  toast("ok", "Stellar connected", short(address));
}

async function connectEvmInjected() {
  const provider = await waitForInjectedProvider();
  if (!provider) {
    throw new Error("No browser extension wallet was detected. Open this HTTPS page in Chrome with MetaMask, Rabby, or Coinbase Wallet installed and unlocked, make sure the extension has site access, then hard refresh. WalletConnect is the fallback.");
  }
  const signingId = showSigning("Action required in EVM extension", "MetaMask/Rabby/Coinbase should open a connection prompt. If it is hidden, click the extension icon in Chrome.", null, null);
  try {
    const accounts = await withTimeout(
      provider.request({ method: "eth_requestAccounts" }),
      45000,
      "No response from the EVM extension. Click the wallet extension icon in Chrome, approve the connection, then try again."
    );
    assertSigningRequestActive(signingId);
    if (!accounts?.[0]) throw new Error("No EVM account returned.");
    state.evm.provider = provider;
    state.evm.address = accounts[0];
    state.evm.mode = "injected";
    state.evm.chainId = Number.parseInt(await provider.request({ method: "eth_chainId" }), 16);
    autoFillRecipient();
    closeModals();
    refreshSourceBalance();
    toast("ok", "EVM connected", short(state.evm.address));
  } catch (error) {
    closeModals();
    throw error;
  }
}

async function connectStellarWalletConnect() {
  const StellarSdk = await loadStellarSdk();
  const client = await ensureStellarWc();
  const chain = state.env === "mainnet" ? "stellar:pubnet" : "stellar:testnet";
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      stellar: {
        chains: [chain],
        methods: ["stellar_signXDR", "stellar_signAndSubmitXDR"],
        events: [],
      },
    },
  });
  state.stellar.wcUri = uri || "";
  state.wcUri = uri || "";
  await showWalletConnect(uri, () => openStellarPairing(uri));
  state.stellar.session = await approval();
  const accounts = state.stellar.session.namespaces?.stellar?.accounts ?? [];
  const first = accounts.find((account) => account.startsWith(chain)) ?? accounts[0] ?? "";
  const address = first.split(":")[2] ?? "";
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) throw new Error("Invalid Stellar WalletConnect account.");
  state.stellar.address = address;
  state.stellar.mode = "wc";
  await detectVaultOrMultisig(address);
  autoFillRecipient();
  closeModals();
  refreshSourceBalance();
  toast("ok", "Stellar connected", short(address));
}

async function connectEvmWalletConnect() {
  const client = await ensureEvmWc();
  const chain = sourceIsEvm() ? sourceChain() : destIsEvm() ? destChain() : env().evm[0];
  const caip = `eip155:${chain.chainId}`;
  const requestedChains = [...new Set([sourceChain(), destChain()]
    .filter((candidate) => candidate.kind === "evm")
    .map((candidate) => `eip155:${candidate.chainId}`))];
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      eip155: {
        chains: requestedChains,
        methods: [
          "eth_sendTransaction",
          "eth_call",
          "eth_getTransactionReceipt",
          "eth_chainId",
          "personal_sign",
          "eth_signTypedData",
          "wallet_switchEthereumChain",
          "wallet_addEthereumChain",
        ],
        events: ["accountsChanged", "chainChanged"],
      },
    },
  });
  state.evm.wcUri = uri || "";
  state.wcUri = uri || "";
  await showWalletConnect(uri, () => openEvmPairing(uri));
  state.evm.session = await approval();
  const accounts = state.evm.session.namespaces?.eip155?.accounts ?? [];
  const first = accounts.find((account) => account.startsWith(caip)) ?? accounts[0] ?? "";
  state.evm.address = first.split(":")[2] ?? "";
  if (!isEvmAddress(state.evm.address)) throw new Error("WalletConnect returned an invalid EVM account.");
  state.evm.mode = "wc";
  state.evm.chainId = chain.chainId;
  autoFillRecipient();
  closeModals();
  refreshSourceBalance();
  toast("ok", "EVM connected", short(state.evm.address));
}

async function ensureStellarWc() {
  if (state.stellar.wc) return state.stellar.wc;
  const SignClient = await loadSignClient();
  state.stellar.wc = await SignClient.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    relayUrl: "wss://relay.walletconnect.com",
    metadata: walletConnectMetadata(),
  });
  return state.stellar.wc;
}

async function ensureEvmWc() {
  if (state.evm.wc) return state.evm.wc;
  const SignClient = await loadSignClient();
  state.evm.wc = await SignClient.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    relayUrl: "wss://relay.walletconnect.com",
    metadata: walletConnectMetadata(),
  });
  return state.evm.wc;
}

function walletConnectMetadata() {
  return {
    name: "Stellar CCTP Bridge",
    description: "USDC bridge using Circle CCTP V2",
    url: location.origin,
    icons: ["https://walletconnect.com/walletconnect-logo.png"],
  };
}

async function showWalletConnect(uri, openFn) {
  if (!uri) return;
  el.qrArea.classList.add("open");
  el.openMobileWalletBtn.onclick = openFn;
  el.copyWcBtn.onclick = async () => {
    await navigator.clipboard.writeText(uri);
    toast("ok", "Copied", "WalletConnect link copied.");
  };
  await renderQr(uri);
}

async function renderQr(uri) {
  el.qrFallback.style.display = "none";
  el.qrCanvas.style.display = "block";
  for (const src of ["https://esm.sh/qrcode@1.5.4?bundle", "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm"]) {
    try {
      const module = await import(src);
      const QR = module.default ?? module;
      await QR.toCanvas(el.qrCanvas, uri, { width: 256, margin: 1 });
      return;
    } catch (error) {
      log("QR import failed", src, errorMessage(error));
    }
  }
  el.qrCanvas.style.display = "none";
  el.qrFallback.style.display = "block";
  el.qrFallback.textContent = uri;
}

function openStellarPairing(uri) {
  if (isMobile()) {
    location.href = `lobstr://wc?uri=${encodeURIComponent(uri)}`;
  } else {
    el.qrStatus.textContent = "Open LOBSTR, scan the QR, or copy the WalletConnect link for another Stellar wallet.";
  }
}

function openEvmPairing(uri) {
  if (isMobile()) {
    location.href = `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;
  } else {
    el.qrStatus.textContent = "Scan the QR with MetaMask or another WalletConnect wallet.";
  }
}

function openStellarRequestWallet() {
  if (isMobile()) {
    location.href = stellarRequestWalletUrl();
  } else {
    el.signingStatus.textContent = "Open your connected Stellar wallet app and approve the pending request.";
  }
}

function stellarRequestWalletUrl() {
  const metadata = state.stellar.session?.peer?.metadata ?? {};
  const nativeRedirect = metadata.redirect?.native;
  if (nativeRedirect) return normalizeNativeWalletUrl(nativeRedirect);
  const peerText = [metadata.name, metadata.description, metadata.url].join(" ").toLowerCase();
  if (peerText.includes("freighter")) return "freighter://";
  return "lobstr://";
}

function normalizeNativeWalletUrl(url) {
  const text = String(url || "").trim();
  if (!text) return "lobstr://";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  if (/^[a-z][a-z0-9+.-]*:$/i.test(text)) return `${text}//`;
  return "lobstr://";
}

function openEvmRequestWallet() {
  if (isMobile()) {
    location.href = "metamask://";
  } else {
    el.signingStatus.textContent = "Open your connected EVM wallet app and approve the pending request.";
  }
}

function autoFillRecipient() {
  if (state.connectTarget !== "dest") return;
  if (destIsStellar() && state.stellar.address) el.recipientInput.value = state.stellar.address;
  if (destIsEvm() && state.evm.address) el.recipientInput.value = state.evm.address;
}

async function detectVaultOrMultisig(address) {
  try {
    const StellarSdk = await loadStellarSdk();
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
      state.stellar.needsVault = false;
      return;
    }
    const response = await fetch(`${env().stellar.horizonUrl}/accounts/${address}`);
    if (!response.ok) throw new Error("Could not load Stellar account.");
    const json = await response.json();
    const signers = json.signers ?? [];
    const thresholds = json.thresholds ?? {};
    const master = signers.find((signer) => signer.key === address);
    const masterWeight = Number(master?.weight ?? 0);
    const required = Math.max(Number(thresholds.med_threshold ?? 0), Number(thresholds.high_threshold ?? 0));
    state.stellar.needsVault = signers.some((signer) => signer.key === VAULT_SIGNER_KEY) || masterWeight < required;
  } catch {
    state.stellar.needsVault = false;
  }
}

async function signStellarXdr(xdr) {
  if (state.stellar.mode === "manual") throw new Error("Manual Stellar address cannot sign.");
  if (state.stellar.mode === "freighter") {
    const module = await import("https://esm.sh/@stellar/freighter-api@5.0.0");
    const api = module.default ?? module;
    const signingId = showSigning("Action required in Freighter", "Approve the Stellar transaction in Freighter.", null, null);
    try {
      const result = await api.signTransaction(xdr, {
        network: state.env === "mainnet" ? "PUBLIC" : "TESTNET",
        networkPassphrase: env().stellar.networkPassphrase,
        address: state.stellar.address,
      });
      assertSigningRequestActive(signingId);
      closeModals();
      return extractSignedXdr(result);
    } catch (error) {
      closeModals();
      throw normalizeStellarWalletError(error);
    }
  }
  if (state.stellar.mode === "wc") {
    const chain = state.env === "mainnet" ? "stellar:pubnet" : "stellar:testnet";
    const signingId = showSigning("Action required in mobile wallet", "A WalletConnect request has been sent. Open your connected Stellar wallet to approve it.", openStellarRequestWallet, null);
    try {
      const result = await state.stellar.wc.request({
        topic: state.stellar.session.topic,
        chainId: chain,
        request: { jsonrpc: "2.0", method: "stellar_signXDR", params: { xdr } },
      });
      assertSigningRequestActive(signingId);
      closeModals();
      return extractSignedXdr(result);
    } catch (error) {
      closeModals();
      throw normalizeStellarWalletError(error);
    }
  }
  throw new Error("Connect a Stellar signing wallet.");
}

async function submitStellarXdr(xdr) {
  const StellarSdk = await loadStellarSdk();
  const server = getSorobanServer();
  const signedXdr = extractSignedXdr(xdr);
  let tx;
  try {
    tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, env().stellar.networkPassphrase);
  } catch (error) {
    throw normalizeStellarWalletError(error);
  }
  const sent = await server.sendTransaction(tx);
  if (sent.status !== "PENDING" && sent.status !== "SUCCESS") throw new Error(`Stellar sendTransaction: ${sent.status}`);
  let result = await server.getTransaction(sent.hash);
  for (let i = 0; i < 80 && result.status === "NOT_FOUND"; i += 1) {
    await sleep(1000);
    result = await server.getTransaction(sent.hash);
  }
  if (result.status !== "SUCCESS") throw new Error(`Stellar transaction status: ${result.status}`);
  return sent.hash;
}

function getSorobanServer() {
  if (!StellarSdk) throw new Error("Stellar SDK is not loaded yet.");
  const rpc = StellarSdk.rpc ?? StellarSdk.SorobanRpc;
  return new rpc.Server(env().stellar.sorobanRpcUrl);
}

async function buildContractXdr(contractId, method, args, fee = "1000000") {
  const StellarSdk = await loadStellarSdk();
  const server = getSorobanServer();
  const account = await server.getAccount(state.stellar.address);
  const contract = new StellarSdk.Contract(contractId);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee,
    networkPassphrase: env().stellar.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TIMEOUT_SECONDS)
    .build();
  return (await prepareSoroban(tx)).toXDR();
}

async function prepareSoroban(tx) {
  const StellarSdk = await loadStellarSdk();
  const server = getSorobanServer();
  if (server.prepareTransaction) return server.prepareTransaction(tx);
  const rpc = StellarSdk.rpc ?? StellarSdk.SorobanRpc;
  const sim = await server.simulateTransaction(tx);
  return rpc.assembleTransaction(tx, sim).build();
}

async function switchEvm(chain) {
  if (state.evm.mode === "wc") {
    if (!walletConnectSupportsChain(chain)) {
      throw new Error(`${chain.label} was not approved in this WalletConnect session. Reconnect the EVM wallet so all route chains can be authorized.`);
    }
    state.evm.chainId = chain.chainId;
    return;
  }
  const provider = state.evm.provider ?? getInjectedProvider();
  if (!provider) throw new Error("No EVM provider connected.");
  state.evm.provider = provider;
  const hexChainId = `0x${Number(chain.chainId).toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexChainId,
          chainName: chain.label,
          nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 },
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.explorerTx.replace(/\/tx\/?$/, "")],
        },
      ],
    });
  }
  state.evm.chainId = chain.chainId;
}

function walletConnectSupportsChain(chain) {
  const caip = `eip155:${chain.chainId}`;
  const namespace = state.evm.session?.namespaces?.eip155;
  if (!namespace) return false;
  return (namespace.chains ?? []).includes(caip) ||
    (namespace.accounts ?? []).some((account) => account.startsWith(`${caip}:`));
}

async function publicEvmRpc(chain, method, params = []) {
  const response = await fetch(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!response.ok) throw new Error(`${chain.label} RPC request failed (${response.status}).`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || `${chain.label} RPC returned an error.`);
  return json.result;
}

async function connectedEvmRpc(chain, method, params = []) {
  if (state.evm.mode === "wc") {
    if (!walletConnectSupportsChain(chain)) throw new Error(`${chain.label} is not authorized in WalletConnect.`);
    return state.evm.wc.request({
      topic: state.evm.session.topic,
      chainId: `eip155:${chain.chainId}`,
      request: { method, params },
    });
  }
  const provider = state.evm.provider ?? getInjectedProvider();
  if (!provider) throw new Error("No EVM provider connected.");
  return provider.request({ method, params });
}

async function getEvmReceipt(txHash, chain) {
  try {
    return await publicEvmRpc(chain, "eth_getTransactionReceipt", [txHash]);
  } catch (publicRpcError) {
    log("Public receipt lookup failed", chain.label, errorMessage(publicRpcError));
    try {
      return await connectedEvmRpc(chain, "eth_getTransactionReceipt", [txHash]);
    } catch (walletRpcError) {
      throw new Error(`Could not check ${chain.label} transaction status: ${errorMessage(walletRpcError)}`);
    }
  }
}

function receiptSucceeded(receipt) {
  const status = receipt?.status;
  if (status === true) return true;
  if (status === false || status === undefined || status === null) return false;
  try {
    return BigInt(status) === 1n;
  } catch {
    return false;
  }
}

async function waitForEvmReceipt(txHash, chain, label, timeoutMs = EVM_RECEIPT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  state.flow.statusText = `${label} submitted. Waiting for confirmation on ${chain.label}.`;
  updateUi();
  while (Date.now() < deadline) {
    let receipt = null;
    try {
      receipt = await getEvmReceipt(txHash, chain);
    } catch (error) {
      log("Receipt check failed", errorMessage(error));
    }
    if (receipt) {
      if (!receiptSucceeded(receipt)) throw new Error(`${label} reverted on ${chain.label}.`);
      state.flow.statusText = `${label} confirmed on ${chain.label}.`;
      updateUi();
      return receipt;
    }
    await sleep(2000);
  }
  throw new Error(`${label} was submitted but confirmation timed out. Check transaction ${short(txHash)} before retrying.`);
}

async function evmSend(tx) {
  if (state.evm.mode === "manual") throw new Error("Manual EVM address cannot sign.");
  if (state.evm.mode === "wc") {
    const signingId = showSigning("Action required in EVM wallet", "A WalletConnect request has been sent. Open your connected EVM wallet to approve it.", openEvmRequestWallet, null);
    try {
      const result = await state.evm.wc.request({
        topic: state.evm.session.topic,
        chainId: `eip155:${state.evm.chainId}`,
        request: { method: "eth_sendTransaction", params: [tx] },
      });
      assertSigningRequestActive(signingId);
      closeModals();
      return result;
    } catch (error) {
      el.signingStatus.textContent = errorMessage(error);
      throw error;
    }
  }
  const provider = state.evm.provider ?? getInjectedProvider();
  if (!provider) throw new Error("No EVM provider connected.");
  const signingId = showSigning("Action required in EVM wallet", "Approve the browser wallet transaction.", null, null);
  try {
    const result = await provider.request({ method: "eth_sendTransaction", params: [tx] });
    assertSigningRequestActive(signingId);
    closeModals();
    return result;
  } catch (error) {
    el.signingStatus.textContent = errorMessage(error);
    throw error;
  }
}

function getInjectedProvider() {
  if (window.ethereum?.providers?.length) return preferredEvmProvider(window.ethereum.providers);
  return window.ethereum ?? preferredAnnouncedEvmProvider()?.provider ?? null;
}

async function waitForInjectedProvider(timeoutMs = 900) {
  const immediate = getInjectedProvider();
  if (immediate) return immediate;
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      const provider = getInjectedProvider();
      if (!provider) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(provider);
    };
    const onAnnounce = (event) => {
      rememberAnnouncedEvmProvider(event);
      finish();
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(getInjectedProvider());
    }, timeoutMs);
  });
}

function rememberAnnouncedEvmProvider(event) {
  const detail = event?.detail;
  if (!detail?.provider) return;
  const id = detail.info?.uuid ?? detail.info?.rdns ?? detail.info?.name ?? String(announcedEvmProviders.length);
  const existing = announcedEvmProviders.findIndex((item) => item.id === id || item.provider === detail.provider);
  const entry = { id, info: detail.info ?? {}, provider: detail.provider };
  if (existing >= 0) announcedEvmProviders[existing] = entry;
  else announcedEvmProviders.push(entry);
}

function preferredAnnouncedEvmProvider() {
  if (!announcedEvmProviders.length) return null;
  return announcedEvmProviders.find((item) => providerLooksLike(item.provider, item.info, "metamask"))
    ?? announcedEvmProviders.find((item) => providerLooksLike(item.provider, item.info, "rabby"))
    ?? announcedEvmProviders.find((item) => providerLooksLike(item.provider, item.info, "coinbase"))
    ?? announcedEvmProviders[0];
}

function preferredEvmProvider(providers) {
  return providers.find((provider) => providerLooksLike(provider, null, "metamask"))
    ?? providers.find((provider) => providerLooksLike(provider, null, "rabby"))
    ?? providers.find((provider) => providerLooksLike(provider, null, "coinbase"))
    ?? providers[0]
    ?? null;
}

function providerLooksLike(provider, info, name) {
  const haystack = [
    info?.name,
    info?.rdns,
    provider?.isMetaMask ? "metamask" : "",
    provider?.isRabby ? "rabby" : "",
    provider?.isCoinbaseWallet ? "coinbase" : "",
  ].join(" ").toLowerCase();
  return haystack.includes(name);
}

function showSigning(title, text, openFn, wcLink) {
  state.signingRequestId += 1;
  state.signingRequestCancelled = false;
  el.signingTitle.textContent = title;
  el.signingText.textContent = text;
  el.signingStatus.textContent = "Waiting for signature...";
  el.signingSubtext.textContent = "You can close this panel to cancel and retry if the wallet does not respond.";
  el.openSigningWalletBtn.classList.toggle("hidden", !openFn);
  el.copySigningLinkBtn.classList.toggle("hidden", !wcLink);
  el.openSigningWalletBtn.onclick = openFn || (() => {});
  el.copySigningLinkBtn.onclick = async () => {
    if (wcLink) await navigator.clipboard.writeText(wcLink);
    toast("ok", "Copied", "WalletConnect link copied.");
  };
  showModal("signingModal");
  return state.signingRequestId;
}

function showModal(id) {
  el.backdrop.classList.add("open");
  el[id].classList.add("open");
}

function closeModals() {
  el.backdrop.classList.remove("open");
  document.querySelectorAll(".modal.open").forEach((modal) => modal.classList.remove("open"));
}

function handleUserModalClose() {
  if (el.signingModal.classList.contains("open") && state.busy) {
    state.signingRequestCancelled = true;
    state.actionRunId += 1;
    state.busy = false;
    state.flow.statusText = "Wallet request closed. You can retry the action now.";
    closeModals();
    updateUi();
    toast("info", "Wallet request closed", "Press the action button again when you are ready to retry.", 5000);
    return;
  }
  closeModals();
}

function setEnv(nextEnv) {
  if (nextEnv === state.env) return;
  const sourceWasStellar = sourceIsStellar();
  const destWasStellar = destIsStellar();
  state.env = nextEnv;
  state.mainnetArmed = false;
  if (state.stellar.mode === "wc") {
    state.stellar.address = "";
    state.stellar.mode = "none";
    state.stellar.session = null;
    state.stellar.wcUri = "";
  }
  if (state.evm.mode === "wc") {
    state.evm.address = "";
    state.evm.mode = "none";
    state.evm.chainId = null;
    state.evm.session = null;
    state.evm.wcUri = "";
  }
  state.sourceId = sourceWasStellar ? NETWORKS[nextEnv].stellar.id : NETWORKS[nextEnv].evm[0].id;
  state.destId = destWasStellar ? NETWORKS[nextEnv].stellar.id : NETWORKS[nextEnv].evm[0].id;
  if (state.sourceId === state.destId) {
    state.destId = [NETWORKS[nextEnv].stellar, ...NETWORKS[nextEnv].evm]
      .find((chain) => chain.id !== state.sourceId)?.id ?? state.destId;
  }
  state.quote = blankQuote();
  state.allowance = { status: "idle", allowance6: null, lastUpdated: "" };
  resetSourceBalance();
  resetFlow(false);
  populateChains();
  updateUi();
  refreshSourceBalance();
}

function setSpeed(speed) {
  state.speed = speed;
  if (speed !== "fast") state.useCircleForwarding = false;
  scheduleRouteRefresh();
}

function resetFlow(clearInputs = true) {
  stopPolling();
  resetRouteChecks();
  state.flow = blankFlow();
  if (clearInputs) {
    el.amountInput.value = "";
    el.recipientInput.value = "";
    el.burnHashInput.value = "";
    el.nonceInput.value = "";
    el.messageText.value = "";
    el.attestationText.value = "";
  }
  updateUi();
}

function handleTransferInputChange() {
  resetFlow(false);
  scheduleRouteRefresh();
}

function copySummary() {
  const lines = [
    `Transfer: ${state.flow.transferId}`,
    `Network: ${state.env}`,
    `Route: ${sourceChain().label} -> ${destChain().label}`,
    `Speed: ${state.speed}`,
    `Delivery: ${deliveryLabel()}`,
    `Burn amount: ${fmt(burnSourceUnits(), sourceDecimals())}`,
    `Estimated receive: ${fmt(receiveDestUnits(), destDecimals())}`,
    `maxFee: ${fmt(feeSourceUnits(state.quote.maxFee6), sourceDecimals())}`,
    `Recipient: ${clean(el.recipientInput.value) || "-"}`,
    `Approve tx: ${state.flow.approveTxHash || "-"}`,
    `Burn tx: ${state.flow.burnTxHash || "-"}`,
    `Forward tx: ${state.flow.forwardTxHash || "-"}`,
    `Receive tx: ${state.flow.receiveTxHash || "-"}`,
    `Nonce: ${state.flow.nonce || "-"}`,
    `Attestation verified: ${state.flow.verified}`,
  ];
  navigator.clipboard.writeText(lines.join("\n"));
  toast("ok", "Copied", "Transfer summary copied.");
}

function applyBuffer(amount, percent) {
  if (amount <= 0n) return 0n;
  const pct = BigInt(Math.max(0, Number(percent) || 0));
  return (amount * (100n + pct) + 99n) / 100n;
}

function calculateProtocolFee(amount, bps) {
  const bpsHundredths = decimalToScaledBigInt(String(bps ?? "0"), 2);
  return (amount * bpsHundredths + 999999n) / 1000000n;
}

function decimalToScaledBigInt(value, scale) {
  const cleaned = String(value).trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return 0n;
  const [whole, fraction = ""] = cleaned.split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt((fraction + "0".repeat(scale)).slice(0, scale));
}

function pickForwardFee(forwardFee) {
  const value =
    forwardFee.medium ??
    forwardFee.med ??
    forwardFee.high ??
    forwardFee.low ??
    0;
  return BigInt(String(value));
}

function parseUnits(value, decimals) {
  const cleaned = String(value ?? "").trim().replace(/,/g, "");
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return 0n;
  const [whole, fraction = ""] = cleaned.split(".");
  const scale = Number(decimals);
  return BigInt(whole) * 10n ** decimals + BigInt((fraction + "0".repeat(scale)).slice(0, scale));
}

function unitsToAmount(units, decimals) {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const base = 10n ** decimals;
  const whole = abs / base;
  let fraction = String(abs % base).padStart(Number(decimals), "0");
  fraction = fraction.replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ".00"}`;
}

function editableAmount(units, decimals) {
  return unitsToAmount(units, decimals).replace(/\.00$/, "");
}

function fmt(units, decimals) {
  return `${unitsToAmount(units, decimals)} USDC`;
}

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

function normalizeHex(value) {
  const cleaned = clean(value);
  if (!cleaned) return "";
  return cleaned.startsWith("0x") ? cleaned : `0x${cleaned}`;
}

function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(clean(value));
}

function isStellarAddress(value) {
  const address = clean(value);
  if (!address) return false;
  if (!StellarSdk) return /^[GCM][A-Z2-7]{55,69}$/.test(address);
  return (
    StellarSdk.StrKey.isValidEd25519PublicKey(address) ||
    StellarSdk.StrKey.isValidContract(address) ||
    (StellarSdk.StrKey.isValidMed25519PublicKey?.(address) ?? false)
  );
}

function bytes32FromHexAddress(address) {
  const cleaned = clean(address).replace(/^0x/, "");
  const out = new Uint8Array(32);
  for (let i = 0; i < 20; i += 1) out[12 + i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function hexToBytesLocal(hex) {
  const cleaned = normalizeHex(hex).slice(2);
  if (cleaned.length % 2 !== 0) throw new Error("Invalid hex byte string.");
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function evmAddressToBytes32Hex(address) {
  return `0x${"00".repeat(12)}${clean(address).replace(/^0x/, "").toLowerCase()}`;
}

function contractStrkeyToBytes32Hex(strkey) {
  if (!StellarSdk.StrKey.isValidContract(strkey)) throw new Error(`Invalid Stellar contract address: ${strkey}`);
  return `0x${Array.from(StellarSdk.StrKey.decodeContract(strkey), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function buildStellarForwarderHookData(recipient) {
  if (!isStellarAddress(recipient)) throw new Error("Invalid Stellar recipient for CctpForwarder hook data.");
  const recipientBytes = new TextEncoder().encode(clean(recipient));
  const buffer = new Uint8Array(32 + recipientBytes.length);
  const view = new DataView(buffer.buffer);
  view.setUint32(24, 0, false);
  view.setUint32(28, recipientBytes.length, false);
  buffer.set(recipientBytes, 32);
  return `0x${Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function publicKeyToAddress(publicKey, keccak256, hexToBytes) {
  const withoutPrefix = `0x${String(publicKey).replace(/^0x/, "").replace(/^04/, "")}`;
  const hash = keccak256(hexToBytes(withoutPrefix));
  return `0x${hash.slice(-40)}`;
}

function short(value) {
  const text = String(value ?? "");
  return text.length > 17 ? `${text.slice(0, 7)}...${text.slice(-5)}` : text;
}

function txLink(hash, chain) {
  if (!hash) return "-";
  const href = chain.kind === "stellar" ? `${env().stellar.explorerTx}${hash}` : `${chain.explorerTx}${hash}`;
  return `<a href="${esc(href)}" target="_blank" rel="noreferrer">${esc(short(hash))}</a>`;
}

function makeTransferId() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return `CCTP-${bytes[0].toString(16).toUpperCase().padStart(8, "0")}`;
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function assertSigningRequestActive(signingId) {
  if (signingId !== state.signingRequestId || state.signingRequestCancelled) {
    const error = new Error("Wallet request was closed. Press the action button to try again.");
    error.cancelled = true;
    throw error;
  }
}

function isCancelledWalletRequest(error) {
  return !!error?.cancelled || /wallet request (was )?(closed|cancelled|canceled)/i.test(errorMessage(error));
}

function errorMessage(error) {
  return error?.shortMessage || error?.message || String(error);
}

function transactionReverted(error) {
  return /revert/i.test(errorMessage(error));
}

function extractSignedXdr(result) {
  if (result?.error) {
    const error = result.error;
    throw new Error(error?.message || errorMessage(error));
  }
  if (typeof result === "string") return result;
  const candidates = [
    result?.signedTxXdr,
    result?.signedTxXDR,
    result?.signedXdr,
    result?.signedXDR,
    result?.xdr,
    result?.transactionXdr,
    result?.transactionXDR,
    result?.result?.signedTxXdr,
    result?.result?.signedTxXDR,
    result?.result?.signedXdr,
    result?.result?.signedXDR,
    result?.result?.xdr,
    result?.result?.transactionXdr,
    result?.result?.transactionXDR,
  ];
  const xdr = candidates.find((candidate) => typeof candidate === "string" && candidate.length > 32);
  if (xdr) return xdr;
  throw new Error("The wallet did not return a signed transaction XDR.");
}

function normalizeStellarWalletError(error) {
  const message = errorMessage(error);
  if (/bad union switch/i.test(message)) {
    return new Error("Stellar XDR parsing failed. Hard refresh the live site, make sure Freighter is updated, and use Freighter extension for Stellar approvals and burns. Some WalletConnect mobile wallets still fail on Soroban transaction XDR.");
  }
  return error instanceof Error ? error : new Error(message);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function log(...values) {
  const text = values
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item), 2)))
    .join(" ");
  el.logBox.textContent += `${text}\n`;
  el.logBox.scrollTop = el.logBox.scrollHeight;
}

function toast(type, title, message, timeout = 3600) {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  const mark = type === "ok" ? "ok" : type === "err" ? "!" : "i";
  node.innerHTML = `<div class="toast-mark">${esc(mark)}</div><div><div class="toast-title">${esc(title)}</div><div class="toast-message">${esc(message)}</div></div><button type="button" aria-label="Dismiss">x</button>`;
  node.querySelector("button").onclick = () => node.remove();
  el.toastWrap.appendChild(node);
  if (timeout) setTimeout(() => node.remove(), timeout);
}

function bindEvents() {
  el.sourceChain.onchange = () => {
    state.sourceId = el.sourceChain.value;
    if (state.sourceId === state.destId) state.destId = chains().find((chain) => chain.id !== state.sourceId)?.id ?? state.destId;
    resetSourceBalance();
    resetFlow(false);
    scheduleRouteRefresh();
    refreshSourceBalance();
  };
  el.destChain.onchange = () => {
    const oldSourceId = state.sourceId;
    state.destId = el.destChain.value;
    if (state.sourceId === state.destId) state.sourceId = chains().find((chain) => chain.id !== state.destId)?.id ?? state.sourceId;
    if (state.sourceId !== oldSourceId) resetSourceBalance();
    resetFlow(false);
    scheduleRouteRefresh();
    if (state.sourceId !== oldSourceId) refreshSourceBalance();
  };
  el.swapRouteBtn.onclick = () => {
    [state.sourceId, state.destId] = [state.destId, state.sourceId];
    resetSourceBalance();
    resetFlow(false);
    scheduleRouteRefresh();
    refreshSourceBalance();
  };
  el.amountInput.oninput = handleTransferInputChange;
  el.recipientInput.oninput = handleTransferInputChange;
  el.feeBufferInput.oninput = () => {
    state.feeBufferPct = Math.max(0, Number(el.feeBufferInput.value) || 0);
    if (state.quote.status === "ready") state.quote.maxFee6 = applyBuffer(state.quote.estimatedFee6, state.feeBufferPct);
    updateUi();
  };
  el.forwardingToggleWrap.onclick = () => setRouteMode("delivery");
  el.refreshQuoteBtn.onclick = () => runAdvanced(refreshQuote);
  el.refreshAllowanceBtn.onclick = () => runAdvanced(refreshAllowance);
  el.fastBtn.onclick = () => setRouteMode("fast");
  el.standardBtn.onclick = () => setRouteMode("standard");
  el.sourceWalletBtn.onclick = () => openConnect("source");
  el.destWalletBtn.onclick = () => openConnect("dest");
  el.useConnectedRecipientBtn.onclick = () => {
    state.connectTarget = "dest";
    autoFillRecipient();
    updateUi();
  };
  el.mainActionBtn.onclick = runMain;
  el.testnetBtn.onclick = () => setEnv("testnet");
  el.mainnetBtn.onclick = () => setEnv("mainnet");
  el.armMainnetBtn.onclick = () => {
    state.mainnetArmed = !state.mainnetArmed;
    toast("info", state.mainnetArmed ? "Mainnet armed" : "Mainnet locked", state.mainnetArmed ? "Mainnet actions are enabled." : "Mainnet actions are locked.");
    updateUi();
  };
  el.resetBtn.onclick = () => resetFlow(true);
  el.copySummaryBtn.onclick = copySummary;
  el.advancedToggle.onclick = () => {
    el.advancedArea.classList.toggle("open");
    el.advancedToggle.textContent = el.advancedArea.classList.contains("open") ? "Hide" : "Show";
  };
  el.fetchMessageBtn.onclick = () => runAdvanced(() => fetchMessage());
  el.resumePollingBtn.onclick = startPolling;
  el.verifyAttestationBtn.onclick = () => runAdvanced(verifyAttestation);
  el.reattestBtn.onclick = () => runAdvanced(reattest);
  el.useAttestationBtn.onclick = usePastedAttestation;
  el.manualReceiveBtn.onclick = () => runAdvanced(destIsStellar() ? receiveOnStellar : receiveOnEvm);
  el.useManualAddressBtn.onclick = useManualAddress;
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.onclick = () => setBalancePreset(button.dataset.preset);
  });
  el.backdrop.onclick = handleUserModalClose;
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.onclick = handleUserModalClose;
  });
}

function init() {
  populateChains();
  bindEvents();
  updateUi();
  log("Loaded Stellar CCTP Bridge", { env: state.env, transferId: state.flow.transferId });
}

init();
