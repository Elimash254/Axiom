/**
 * Returns an image URL for a given asset symbol.
 * Uses cryptologos.cc for crypto, Clearbit for stock logos via domain.
 *
 * @param {string} symbol   - e.g. "BTC", "ETH", "SCOM", "AAPL"
 * @param {string} type     - "stock" | "crypto"
 * @returns {string|null}   - image URL or null to fall back to initials
 */

const STOCK_DOMAINS = {
    // NSE stocks
    SCOM: 'safaricom.co.ke',
    EQTY: 'equitygroupholdings.com',
    KCB: 'kcbgroup.com',
    EABL: 'eabl.com',
    SBIC: 'sc.com/ke',
    BAMB: 'bamburi.co.ke',
    BAT: 'bat.com/kenya',
    NMG: 'nation.co.ke',
    UNGA: 'unga-group.com',
    CIC: 'cic.co.ke',
    COOP: 'co-opbank.co.ke',
    NCBA: 'ncbagroup.com',
    STANBIC: 'stanbicbank.co.ke',
    ABSA: 'absa.co.ke',
    DTBK: 'dtbafrica.com',
    JUB: 'jubileekenya.com',
    BRIT: 'britam.com',
    TOTL: 'total.co.ke',
    SCAN: 'scangroup.com',
    WTK: 'williamsontea.com',
    SGL: 'sasini.co.ke',
    KENAIR: 'kenya-airways.com',
    FTGH: 'fidelityinsurance.co.ke',
    UCHMI: 'uchumi.co.ke',
    OCH: 'olympiacapital.co.ke',
    PORT: 'centum.co.ke',
    LGTV: 'longhornpublishers.com',
    KEGN: 'kengen.co.ke',
    KUKZ: 'kurwitu.com',
    HAFR: 'homeafrica.co.ke',
    TCL: 'trans-century.com',
    CK: 'carbacid.com',
    // US stocks
    AAPL: 'apple.com',
    MSFT: 'microsoft.com',
    GOOGL: 'google.com',
    AMZN: 'amazon.com',
    TSLA: 'tesla.com',
    META: 'meta.com',
    NVDA: 'nvidia.com',
    JPM: 'jpmorganchase.com',
    V: 'visa.com',
    JNJ: 'jnj.com',
    WMT: 'walmart.com',
    PG: 'pg.com',
    MA: 'mastercard.com',
    HD: 'homedepot.com',
    CVX: 'chevron.com',
    KO: 'coca-cola.com',
    PEP: 'pepsico.com',
    DIS: 'thewaltdisneycompany.com',
    NFLX: 'netflix.com',
    INTC: 'intel.com',
    AMD: 'amd.com',
    PYPL: 'paypal.com',
    PFE: 'pfizer.com',
    BAC: 'bankofamerica.com',
    ABBV: 'abbvie.com',
    CRM: 'salesforce.com',
    ADBE: 'adobe.com',
    COST: 'costco.com',
    AVGO: 'broadcom.com',
    ORCL: 'oracle.com',
    NKE: 'nike.com',
    MCD: 'mcdonalds.com',
    CSCO: 'cisco.com',
    TMO: 'thermofisher.com',
    ACN: 'accenture.com',
    ABT: 'abbott.com',
    DHR: 'danaher.com',
    TXN: 'ti.com',
    QCOM: 'qualcomm.com',
    UBER: 'uber.com',
    SHOP: 'shopify.com',
    SQ: 'block.xyz',
    PLTR: 'palantir.com',
    COIN: 'coinbase.com',
    HOOD: 'robinhood.com',
    SOXL: 'direxion.com',
    SOFI: 'sofi.com',
    RIVN: 'rivian.com',
    LCID: 'lucidmotors.com',
    PLUG: 'plugpower.com',
  };
  
  const CRYPTO_LOGOS = {
    BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    XRP: 'https://cryptologos.cc/logos/ripple-xrp-logo.png',
    ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
    DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
    DOT: 'https://cryptologos.cc/logos/polkadot-dot-logo.png',
    MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
    LINK: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
    LTC: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
    TRX: 'https://cryptologos.cc/logos/tron-trx-logo.png',
    SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png',
    HBAR: 'https://cryptologos.cc/logos/hedera-hbar-logo.png',
    TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.png',
    UNI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    ATOM: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
    XLM: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
    NEAR: 'https://cryptologos.cc/logos/near-protocol-near-logo.png',
    APT: 'https://cryptologos.cc/logos/aptos-apt-logo.png',
    FIL: 'https://cryptologos.cc/logos/filecoin-fil-logo.png',
    ICP: 'https://cryptologos.cc/logos/internet-computer-icp-logo.png',
    ARB: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    OP: 'https://cryptologos.cc/logos/optimism-op-logo.png',
    DAI: 'https://cryptologos.cc/logos/dai-dai-logo.png',
    PEPE: 'https://cryptologos.cc/logos/pepe-pepe-logo.png',
  };
  
  export default function getAssetIcon(symbol, type) {
    if (!symbol) return null;
    const sym = symbol.toUpperCase();
  
    if (type === 'crypto') {
      if (CRYPTO_LOGOS[sym]) return CRYPTO_LOGOS[sym];
      return `https://cryptologos.cc/logos/${sym.toLowerCase()}-${sym.toLowerCase()}-logo.png`;
    }
  
    // Stocks: use Clearbit logo API via domain
    const domain = STOCK_DOMAINS[sym];
    if (domain) return `https://logo.clearbit.com/${domain}`;
  
    return null;
  }