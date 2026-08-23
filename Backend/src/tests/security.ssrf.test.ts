/**
 * SSRF protection for outbound fetches.
 *
 * The job-URL extractor and the listing liveness check both make the server
 * fetch a user-supplied address from inside the Azure App Service network,
 * and both feed part of the result back to the caller. Without the guard in
 * utils/urlGuard that is a read primitive against the instance metadata
 * endpoint, anything else on the VNet, and the API's own loopback interface.
 *
 * DNS is mocked throughout so the suite is deterministic and offline: the
 * point is to prove the resolved address is what gets checked, which is the
 * part a hostname allowlist cannot do on its own.
 */

import dns from 'dns';
import { assertUrlIsFetchable, isBlockedAddress, SsrfBlockedError } from '../utils/urlGuard';

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), debug: jest.fn() },
}));

/** Point every hostname lookup at a chosen set of addresses. */
function mockResolveTo(...addresses: string[]) {
  return jest
    .spyOn(dns.promises, 'lookup')
    .mockResolvedValue(
      addresses.map((address) => ({
        address,
        family: address.includes(':') ? 6 : 4,
      })) as never
    );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isBlockedAddress', () => {
  describe('IPv4 ranges that must never be reachable', () => {
    const blocked: Array<[string, string]> = [
      ['127.0.0.1', 'loopback'],
      ['127.1.1.1', 'loopback, non-canonical form'],
      ['0.0.0.0', 'unspecified'],
      ['10.0.0.1', 'RFC1918 /8'],
      ['10.255.255.254', 'RFC1918 /8 upper bound'],
      ['172.16.0.1', 'RFC1918 /12 lower bound'],
      ['172.31.255.254', 'RFC1918 /12 upper bound'],
      ['192.168.1.1', 'RFC1918 /16'],
      ['169.254.169.254', 'cloud instance metadata'],
      ['169.254.0.1', 'link-local'],
      ['100.64.0.1', 'carrier-grade NAT'],
      ['192.0.0.1', 'IETF protocol assignments'],
      ['198.18.0.1', 'benchmarking'],
      ['224.0.0.1', 'multicast'],
      ['239.255.255.255', 'multicast upper bound'],
      ['240.0.0.1', 'reserved'],
      ['255.255.255.255', 'broadcast'],
    ];

    it.each(blocked)('blocks %s (%s)', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });
  });

  describe('public IPv4 addresses stay reachable', () => {
    const allowed = [
      '8.8.8.8',
      '1.1.1.1',
      '52.169.1.1',
      '172.15.255.255', // just below the RFC1918 /12 block
      '172.32.0.1',     // just above the RFC1918 /12 block
      '11.0.0.1',       // just above the 10/8 block
      '100.63.255.255', // just below the CGNAT block
      '100.128.0.1',    // just above the CGNAT block
    ];

    it.each(allowed)('allows %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });

  describe('IPv6', () => {
    const blocked: Array<[string, string]> = [
      ['::1', 'loopback'],
      ['::', 'unspecified'],
      ['fc00::1', 'unique-local'],
      ['fd12:3456::1', 'unique-local'],
      ['fe80::1', 'link-local'],
      ['ff02::1', 'multicast'],
      ['2002:c0a8:0101::1', '6to4 relay'],
      ['64:ff9b::1', 'NAT64'],
      ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
      ['::ffff:169.254.169.254', 'IPv4-mapped metadata endpoint'],
      ['::ffff:10.0.0.1', 'IPv4-mapped private'],
      ['fe80::1%eth0', 'link-local with zone index'],
    ];

    it.each(blocked)('blocks %s (%s)', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });

    it('allows a public IPv6 address', () => {
      expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
    });
  });

  it('fails closed on anything that is not a valid IP', () => {
    for (const value of ['', 'not-an-ip', '999.999.999.999', '127.0.0.1.evil.com']) {
      expect(isBlockedAddress(value)).toBe(true);
    }
  });
});

describe('assertUrlIsFetchable', () => {
  describe('scheme handling', () => {
    it.each([
      'file:///etc/passwd',
      'gopher://127.0.0.1:11211/_stats',
      'ftp://internal.host/secret',
      'data:text/html,<script>alert(1)</script>',
      'jar:http://evil.com!/',
    ])('rejects the %s scheme', async (url) => {
      await expect(assertUrlIsFetchable(url)).rejects.toThrow(SsrfBlockedError);
    });

    it('rejects a malformed URL', async () => {
      await expect(assertUrlIsFetchable('http://[::1')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('embedded credentials', () => {
    it('rejects a URL carrying a username and password', async () => {
      // Credentials in a URL are a redirect-smuggling aid and are never
      // needed to read a public job posting.
      mockResolveTo('93.184.216.34');
      await expect(
        assertUrlIsFetchable('http://user:pass@jobs.example.com/careers')
      ).rejects.toThrow(/embedded credentials/);
    });
  });

  describe('IP literals in the URL need no DNS lookup', () => {
    it.each([
      'http://169.254.169.254/metadata/instance?job=1',
      'http://127.0.0.1:5000/api/admin/users',
      'http://[::1]:5000/jobs',
      'http://10.0.0.5/careers',
      'http://192.168.0.1/jobs',
    ])('blocks %s', async (url) => {
      await expect(assertUrlIsFetchable(url)).rejects.toThrow(SsrfBlockedError);
    });

    it('does not consult DNS for an IP literal', async () => {
      const lookup = mockResolveTo('8.8.8.8');
      await expect(assertUrlIsFetchable('http://127.0.0.1/jobs')).rejects.toThrow(SsrfBlockedError);
      expect(lookup).not.toHaveBeenCalled();
    });
  });

  describe('DNS-based bypasses', () => {
    it('blocks a public-looking hostname that resolves to loopback', async () => {
      // This is the case a hostname allowlist cannot catch: the attacker
      // owns the DNS record and points it wherever they like.
      mockResolveTo('127.0.0.1');
      await expect(assertUrlIsFetchable('https://jobs.evil.com/careers')).rejects.toThrow(
        /reserved address 127\.0\.0\.1/
      );
    });

    it('blocks a hostname that resolves to the metadata endpoint', async () => {
      mockResolveTo('169.254.169.254');
      await expect(assertUrlIsFetchable('https://careers.evil.com/jobs')).rejects.toThrow(
        SsrfBlockedError
      );
    });

    it('blocks when only one of several answers is internal', async () => {
      // Checking just the first record would let this through and then
      // connect to the private address.
      mockResolveTo('93.184.216.34', '10.0.0.7');
      await expect(assertUrlIsFetchable('https://jobs.example.com/careers')).rejects.toThrow(
        /10\.0\.0\.7/
      );
    });

    it('blocks a hostname that resolves to an IPv4-mapped IPv6 loopback', async () => {
      mockResolveTo('::ffff:127.0.0.1');
      await expect(assertUrlIsFetchable('https://jobs.example.com/careers')).rejects.toThrow(
        SsrfBlockedError
      );
    });

    it('blocks a hostname that cannot be resolved', async () => {
      jest.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND') as never);
      await expect(assertUrlIsFetchable('https://nope.invalid/jobs')).rejects.toThrow(
        /could not be resolved/
      );
    });

    it('blocks a hostname that resolves to nothing', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValue([] as never);
      await expect(assertUrlIsFetchable('https://empty.example.com/jobs')).rejects.toThrow(
        /no addresses/
      );
    });
  });

  describe('legitimate URLs', () => {
    it('allows a public job posting and reports its resolved addresses', async () => {
      mockResolveTo('93.184.216.34');
      const result = await assertUrlIsFetchable('https://boards.greenhouse.io/acme/jobs/1');
      expect(result.url.hostname).toBe('boards.greenhouse.io');
      expect(result.addresses).toEqual(['93.184.216.34']);
    });

    it('allows a public IPv6-only host', async () => {
      mockResolveTo('2606:4700:4700::1111');
      await expect(assertUrlIsFetchable('https://jobs.example.com/careers')).resolves.toBeDefined();
    });

    it('accepts both http and https', async () => {
      mockResolveTo('93.184.216.34');
      await expect(assertUrlIsFetchable('http://jobs.example.com/careers')).resolves.toBeDefined();
      await expect(assertUrlIsFetchable('https://jobs.example.com/careers')).resolves.toBeDefined();
    });
  });
});
