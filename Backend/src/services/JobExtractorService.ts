import axios from 'axios';
import * as cheerio from 'cheerio';
import { assertUrlIsFetchable, SsrfBlockedError } from '../utils/urlGuard';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

// --- Types ---

type JobSource = 'linkedin' | 'indeed' | 'external';
type Confidence = 'low' | 'medium' | 'high';

export interface ExtractionResult {
  detected: boolean;
  source: JobSource;
  reason?: string;
  data: {
    title?: string;
    company?: string;
    description?: string;
    location?: string;
  };
  validation: {
    isValid: boolean;
    confidence: Confidence;
  };
}

// --- Trusted Domains ---

const TRUSTED_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'monster.com',
  'careerbuilder.com',
  'simplyhired.com',
  'dice.com',
  'hired.com',
  'remoteok.com',
  'weworkremotely.com',
  'angel.co',
  'wellfound.com',
  'flexjobs.com',
  'snagajob.com',
  'themuse.com',
  'ladders.com',
  'builtin.com',
  'otta.com',
  'lever.co',
  'greenhouse.io',
  'boards.greenhouse.io',
  'workday.com',
  'myworkdayjobs.com',
  'smartrecruiters.com',
  'jobs.ashbyhq.com',
  'apply.workable.com',
  'breezy.hr',
  'recruitee.com',
  'jobs.lever.co',
  'icims.com',
  'taleo.net',
  'successfactors.com',
  'ultipro.com',
  'bamboohr.com',
  'jazzhq.com',
  'jobvite.com',
  'applytojob.com',
  'naukri.com',
  'internshala.com',
  'foundit.in',
  'shine.com',
  'timesjobs.com',
  'freshersworld.com',
  'instahyre.com',
  'hirist.com',
  'cutshort.io',
  'angellist.com',
];

const SOURCE_MAP: Record<string, JobSource> = {
  'linkedin.com': 'linkedin',
  'indeed.com': 'indeed',
};

// --- Service ---

class JobExtractorService {
  private static readonly TIMEOUT_MS = 10000;
  private static readonly MAX_CONTENT_LENGTH = 5 * 1024 * 1024;
  private static readonly MAX_REDIRECTS = 5;

  static async extract(jobUrl: string): Promise<ExtractionResult> {
    const failResult: ExtractionResult = {
      detected: false,
      source: 'external',
      data: {},
      validation: { isValid: false, confidence: 'low' },
    };

    try {
      const parsed = new URL(jobUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ...failResult, reason: 'Invalid URL protocol.' };
      }

      const hostname = parsed.hostname.replace(/^www\./, '');
      const source = this.classifySource(hostname);
      const isTrusted = TRUSTED_DOMAINS.some((d) => hostname.endsWith(d));

      // Reject URLs that don't look like job listings
      if (!this.isJobRelatedUrl(parsed, hostname, isTrusted)) {
        return {
          ...failResult,
          source,
          reason: "This doesn't look like a job listing URL. Please paste a direct link to a job posting.",
        };
      }

      const fetchResult = await this.fetchPage(jobUrl);
      if (!fetchResult.html) {
        let reason: string;
        if (fetchResult.status === 403) {
          reason = hostname + ' blocks automated access. Please fill in the details manually.';
        } else if (fetchResult.status && fetchResult.status >= 400) {
          reason = hostname + ' returned an error (' + fetchResult.status + '). Please fill in manually.';
        } else {
          reason = 'Could not reach ' + hostname + '. Check the URL and try again.';
        }
        return { ...failResult, source, reason };
      }

      const $ = cheerio.load(fetchResult.html) as any;
      let data: ExtractionResult['data'];

      if (source === 'linkedin') {
        data = this.extractLinkedIn($);
      } else if (source === 'indeed') {
        data = this.extractIndeed($);
      } else {
        data = this.extractGeneric($, hostname);
      }

      const detected = !!(data.title && data.title.length > 3);
      const confidence = this.calculateConfidence(data, isTrusted);
      const isValid = confidence !== 'low' && detected;

      let reason: string | undefined;
      if (!detected) {
        reason = hostname + ' renders content with JavaScript which cannot be read server-side. Please fill in the details manually.';
      }

      return { detected, source, data, reason, validation: { isValid, confidence } };
    } catch (err) {
      // A blocked SSRF attempt must surface as a 400 rather than being
      // flattened into the generic "fill it in manually" fallback.
      if (err instanceof ApiError) throw err;
      return { ...failResult, reason: 'An unexpected error occurred. Please fill in manually.' };
    }
  }

  private static classifySource(hostname: string): JobSource {
    for (const [domain, source] of Object.entries(SOURCE_MAP)) {
      if (hostname.endsWith(domain)) return source;
    }
    return 'external';
  }

  // Returns true if the URL plausibly leads to a job listing
  private static isJobRelatedUrl(parsed: URL, hostname: string, isTrusted: boolean): boolean {
    // Trusted job platforms always pass through
    if (isTrusted) return true;

    // Check path + query string for job-related keywords
    const urlText = (parsed.pathname + parsed.search).toLowerCase();
    const JOB_KEYWORDS = [
      'job', 'jobs', 'career', 'careers', 'position', 'positions',
      'vacancy', 'vacancies', 'hiring', 'recruit', 'apply', 'opening',
      'role', 'roles', 'work-with-us', 'work_with_us', 'join-us', 'join_us',
      'employment', 'opportunity', 'opportunities',
    ];
    const hasKeyword = JOB_KEYWORDS.some(kw => urlText.includes(kw));

    // Also accept if the subdomain itself suggests a careers site
    const subdomainKeywords = ['jobs', 'careers', 'hire', 'talent', 'recruit', 'apply'];
    const parts = hostname.split('.');
    const subdomainMatch = parts.some(p => subdomainKeywords.includes(p));

    return hasKeyword || subdomainMatch;
  }

  private static async fetchPage(url: string): Promise<{ html: string | null; status?: number }> {
    try {
      // Redirects are followed by hand so that every hop is re-validated.
      // Letting axios follow them would only check the first URL, and a
      // 302 to http://169.254.169.254/ is the standard SSRF bypass.
      let currentUrl = url;

      for (let hop = 0; hop <= this.MAX_REDIRECTS; hop++) {
        const { url: safeUrl } = await assertUrlIsFetchable(currentUrl);

        const response = await axios.get(safeUrl.toString(), {
          timeout: this.TIMEOUT_MS,
          maxContentLength: this.MAX_CONTENT_LENGTH,
          maxBodyLength: this.MAX_CONTENT_LENGTH,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
          },
          maxRedirects: 0,
          validateStatus: () => true,
          responseType: 'text',
          transformResponse: (body) => body,
        });

        const status = response.status;

        if (status >= 300 && status < 400) {
          const location = (response.headers as any)?.location;
          if (!location) return { html: null, status };
          // Relative redirects resolve against the hop that issued them.
          currentUrl = new URL(String(location), safeUrl).toString();
          continue;
        }

        if (status < 200 || status >= 400) {
          return { html: null, status };
        }

        // Only parse markup. Without this the extractor would happily read
        // JSON or plaintext from an internal service and echo it back to
        // the caller through the title/description fields.
        const contentType = String((response.headers as any)?.['content-type'] ?? '');
        if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
          return { html: null, status };
        }

        const html = typeof response.data === 'string' ? response.data : null;
        return { html, status };
      }

      // Redirect budget exhausted.
      return { html: null };
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        logger.warn('Security: blocked SSRF attempt via job URL extractor', {
          url,
          reason: err.reason,
        });
        throw ApiError.badRequest(
          'That URL could not be fetched. Please use a public job posting link.'
        );
      }
      return { html: null };
    }
  }

  // --- LinkedIn ---

  private static extractLinkedIn($: any): ExtractionResult['data'] {
    const data: ExtractionResult['data'] = {};

    const ogTitle: string = $('meta[property="og:title"]').attr('content')?.trim() || '';
    const titleTag: string = $('title').text().trim();
    const titleToParse = ogTitle || titleTag;

    const hiringMatch = titleToParse.match(
      /^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+?))?(?:\s*[|\u2013\u2014].*)?$/i
    );

    if (hiringMatch) {
      data.company = this.sanitize(hiringMatch[1]);
      data.title = this.sanitize(
        hiringMatch[2].replace(/\s*[|\u2013\u2014\u2026].*$/, '').replace(/\.\.\.$/, '').trim()
      );
      if (hiringMatch[3]) {
        data.location = this.sanitize(hiringMatch[3].replace(/\s*[|\u2013\u2014].*$/, '').trim());
      }
    } else {
      const h1 = $('h1').first().text().trim();
      if (h1 && h1.length > 3) data.title = this.sanitize(h1);
    }

    if (!data.location) {
      const topLocation =
        $('.topcard__flavor--bullet').text().trim() ||
        $('.top-card-layout__bullet').text().trim() ||
        $('.job-details-jobs-unified-top-card__bullet').text().trim();
      if (topLocation) data.location = this.sanitize(topLocation);
    }

    if (!data.company) {
      const orgName =
        $('.topcard__org-name-link').text().trim() ||
        $('.top-card-layout__entity-info a').first().text().trim() ||
        $('meta[property="og:site_name"]').attr('content')?.trim();
      if (orgName && orgName !== 'LinkedIn') data.company = this.sanitize(orgName);
    }

    const descText =
      $('.show-more-less-html__markup').text().trim() ||
      $('.description__text').text().trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim();

    if (descText && descText.length > 20) {
      data.description = this.sanitize(descText, 1000);
    }

    return data;
  }

  // --- Indeed ---

  private static extractIndeed($: any): ExtractionResult['data'] {
    const data: ExtractionResult['data'] = {};

    const ogTitle: string = $('meta[property="og:title"]').attr('content')?.trim() || '';
    const parts = ogTitle.split(/\s*[-\u2013]\s*/);

    if (parts.length >= 2) {
      data.title = this.sanitize(parts[0]);
      data.company = this.sanitize(parts[1].replace(/\s*[|].*$/, '').trim());
      if (parts.length >= 3) {
        data.location = this.sanitize(parts[2].replace(/\s*[|].*$/, '').trim());
      }
    } else {
      const h1 = $('h1').first().text().trim();
      if (h1) data.title = this.sanitize(h1);
    }

    if (!data.company) {
      const company =
        $('[data-company-name]').text().trim() ||
        $('.jobsearch-InlineCompanyRating-companyHeader').text().trim();
      if (company) data.company = this.sanitize(company);
    }

    const desc =
      $('#jobDescriptionText').text().trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim();
    if (desc && desc.length > 20) {
      data.description = this.sanitize(desc, 1000);
    }

    return data;
  }

  // --- Generic ---

  private static extractGeneric($: any, hostname: string): ExtractionResult['data'] {
    const data: ExtractionResult['data'] = {};

    // Title
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    if (ogTitle && ogTitle.length > 3) {
      data.title = this.sanitize(ogTitle);
    } else {
      const titleTag = $('title').first().text().trim();
      if (titleTag && titleTag.length > 3) {
        const cleaned = titleTag.split(/\s*[|\u2013\u2014]\s*/)[0]?.trim();
        data.title = this.sanitize(cleaned || titleTag);
      } else {
        const h1 = $('h1').first().text().trim();
        if (h1 && h1.length > 3) data.title = this.sanitize(h1);
      }
    }

    // Company from JSON-LD
    const ldScript = $('script[type="application/ld+json"]');
    for (let i = 0; i < ldScript.length; i++) {
      try {
        const json = JSON.parse($(ldScript[i]).html() || '');
        const org = json?.hiringOrganization?.name || json?.company?.name || json?.organization?.name;
        if (org) {
          data.company = this.sanitize(org);
          if (json['@type'] === 'JobPosting') {
            if (json.title) data.title = this.sanitize(json.title);
            if (json.description) {
              const stripped = json.description.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
              data.description = this.sanitize(stripped, 1000);
            }
            if (json.jobLocation?.address?.addressLocality) {
              data.location = this.sanitize(json.jobLocation.address.addressLocality);
            }
          }
          break;
        }
      } catch {
        // skip
      }
    }

    // Company fallback
    if (!data.company) {
      const ogSite = $('meta[property="og:site_name"]').attr('content')?.trim();
      if (ogSite && ogSite.length > 1) {
        data.company = this.sanitize(ogSite);
      } else {
        const domainParts = hostname.split('.');
        if (domainParts.length >= 2) {
          const name = domainParts[0];
          const skip = ['linkedin', 'indeed', 'glassdoor', 'lever', 'greenhouse', 'workday', 'jobs', 'careers'];
          if (!skip.includes(name.toLowerCase())) {
            data.company = this.sanitize(name.charAt(0).toUpperCase() + name.slice(1));
          }
        }
      }
    }

    // Description fallback
    if (!data.description) {
      const metaDesc = $('meta[name="description"]').attr('content')?.trim();
      const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
      const desc = ogDesc || metaDesc;
      if (desc && desc.length > 20) {
        data.description = this.sanitize(desc, 1000);
      } else {
        const paragraphs = $('p');
        for (let i = 0; i < Math.min(paragraphs.length, 15); i++) {
          const text = $(paragraphs[i]).text().trim();
          if (text.length > 50) {
            data.description = this.sanitize(text, 1000);
            break;
          }
        }
      }
    }

    return data;
  }

  // --- Confidence ---

  private static calculateConfidence(data: ExtractionResult['data'], isTrusted: boolean): Confidence {
    let score = 0;
    if (data.title && data.title.length > 5) score += 3;
    if (data.company && data.company.length > 1) score += 3;
    if (data.description && data.description.length > 30) score += 2;
    if (data.location) score += 1;
    if (isTrusted) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  // --- Utilities ---

  private static sanitize(text: string, maxLength = 200): string {
    return text.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maxLength);
  }
}

export default JobExtractorService;
