import dns from 'dns';
import net from 'net';
import env from '../config/env';

/**
 * Server-Side Request Forgery (SSRF) protection for outbound fetches.
 *
 * The job-URL extractor fetches an arbitrary user-supplied address from
 * inside the Azure App Service network and returns parts of the response
 * body to the caller. Without a guard that is a read primitive against
 * anything the container can reach: the instance metadata endpoint on
 * 169.254.169.254, other services on the VNet, and the API's own loopback
 * interface. A hostname allowlist is not enough on its own because DNS is
 * attacker-controlled — "jobs.evil.com" can simply resolve to 127.0.0.1 —
 * so the resolved addresses are what actually get checked here.
 */

/** Ranges that must never be reachable from a user-supplied URL. */
const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ['0.0.0.0', 8],        // "this" network
  ['10.0.0.0', 8],       // RFC1918 private
  ['100.64.0.0', 10],    // RFC6598 carrier-grade NAT
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local — includes cloud instance metadata
  ['172.16.0.0', 12],    // RFC1918 private
  ['192.0.0.0', 24],     // IETF protocol assignments
  ['192.0.2.0', 24],     // TEST-NET-1
  ['192.168.0.0', 16],   // RFC1918 private
  ['198.18.0.0', 15],    // benchmarking
  ['198.51.100.0', 24],  // TEST-NET-2
  ['203.0.113.0', 24],   // TEST-NET-3
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved (includes 255.255.255.255)
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_CIDRS.some(([base, bits]) => {
    // A /0 mask would shift by 32, which is a no-op in JS — not used here,
    // but guard anyway so the table stays safe to extend.
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone index

  // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms tunnel the
  // whole IPv4 space through IPv6, so unwrap and re-check as IPv4.
  const mapped = addr.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);

  if (addr === '::' || addr === '::1') return true;        // unspecified, loopback
  if (/^f[cd][0-9a-f]{2}:/.test(addr)) return true;         // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/.test(addr)) return true;         // fe80::/10 link-local
  if (/^ff[0-9a-f]{2}:/.test(addr)) return true;            // ff00::/8 multicast
  if (/^2002:/.test(addr)) return true;                     // 6to4 relay
  if (/^64:ff9b:/.test(addr)) return true;                  // NAT64
  return false;
}

/** True when an already-resolved IP literal points somewhere internal. */
export function isBlockedAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // not a valid IP — fail closed
}

export class SsrfBlockedError extends Error {
  constructor(public readonly reason: string) {
    super(`Blocked outbound request: ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

/**
 * Resolve a hostname to every address it maps to and reject if any of
 * them is internal. All records are checked, not just the first, because
 * a host that returns both a public and a private address would otherwise
 * pass validation and then connect to the private one.
 */
async function assertHostResolvesPublicly(hostname: string): Promise<string[]> {
  // A bare IP literal in the URL needs no lookup.
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new SsrfBlockedError(`address ${hostname} is in a reserved range`);
    }
    return [hostname];
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfBlockedError(`hostname ${hostname} could not be resolved`);
  }

  if (records.length === 0) {
    throw new SsrfBlockedError(`hostname ${hostname} resolved to no addresses`);
  }

  for (const { address } of records) {
    if (isBlockedAddress(address)) {
      throw new SsrfBlockedError(`hostname ${hostname} resolves to reserved address ${address}`);
    }
  }

  return records.map((r) => r.address);
}

/**
 * Validate a URL that the server is about to fetch.
 *
 * Returns the resolved public addresses so a caller can pin the connection
 * if it wants to; throws SsrfBlockedError otherwise. Every redirect hop
 * must be passed through this function as well — validating only the first
 * URL is the single most common way SSRF guards are bypassed.
 */
export async function assertUrlIsFetchable(rawUrl: string): Promise<{ url: URL; addresses: string[] }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('malformed URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    // Blocks file:, gopher:, ftp:, data: and the rest.
    throw new SsrfBlockedError(`protocol ${url.protocol} is not allowed`);
  }

  // Credentials in the URL are a redirect-smuggling aid and are never
  // needed for a public job posting.
  if (url.username || url.password) {
    throw new SsrfBlockedError('URLs with embedded credentials are not allowed');
  }

  // The escape hatch exists for local development against fixture servers.
  // config/env.ts refuses to boot in production when it is enabled.
  if (env.ALLOW_PRIVATE_NETWORK_FETCH) {
    return { url, addresses: [] };
  }

  const addresses = await assertHostResolvesPublicly(url.hostname);
  return { url, addresses };
}
