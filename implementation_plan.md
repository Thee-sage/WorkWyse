# Job URL Extraction Implementation Guide

This guide outlines the architecture and implementation details of the URL data extraction feature, designed so another developer can recreate and extend it in their own application. 

Since the target application intends to extract *more* data than the current implementation, this document explicitly covers current capabilities, technical limitations, and recommended approaches for advanced extraction.

## 1. Core Architecture

The current implementation is a **server-side static HTML scraper** built with TypeScript on a Node.js backend. 

### Tech Stack
- **HTTP Client**: `axios` (configured to mimic a standard browser to avoid immediate bot detection).
- **HTML Parser**: `cheerio` (a fast, server-side implementation of core jQuery for parsing static HTML).
- **URL Parsing**: Built-in Node.js `URL` object to extract domain names, query parameters, and paths.

### Extraction Flow
1. **Validation**: Check if the URL is using `http`/`https`.
2. **Source Classification**: Identify the root domain and determine if a specialized parser (e.g., LinkedIn, Indeed) or a generic parser should be used.
3. **Relevance Check**: Unless the domain is in a hardcoded list of `TRUSTED_DOMAINS` (e.g., `glassdoor.com`, `greenhouse.io`), check the URL path/query for job-related keywords (`/careers`, `/job`, `/apply`).
4. **Fetching**: Request the URL using `axios` with a timeout (e.g., 10s), `maxContentLength` (e.g., 5MB), and standard `User-Agent` headers.
5. **Parsing**: Load the raw HTML string into `cheerio` and apply source-specific extraction logic.
6. **Data Structuring & Confidence Routing**: Calculate an extraction confidence score (`low`, `medium`, `high`) based on the volume and quality of data found.

## 2. Extraction Logic Highlights

### Specialized Parsers (LinkedIn / Indeed)
- Heavily rely on precise DOM selectors (`.topcard__org-name-link`, `#jobDescriptionText`) and Open Graph (`og:title`) metadata.
- Often parse compound titles string using regular expressions (e.g., `"Software Engineer hiring Google in New York"` → extracts Title, Company, Location).

### Generic Parser Fallback
If the domain isn't recognized, the system attempts to scrape data using standard web conventions:
- **Company Name**: Extracts from `og:site_name`, JSON-LD schema (`application/ld+json`), or parses the domain name itself as a fallback.
- **Job Title**: Tries `og:title`, `<title>`, and `<h1>` tags.
- **Location**: Extracts from JSON-LD (`jobLocation.address.addressLocality`).
- **Description**: Prefers `og:description` or `<meta name="description">`. If missing, falls back to aggregating the first few `<p>` tag text contents.

## 3. What the Current Feature CAN Do

- [x] Fast, lightweight extraction without heavy resource overhead.
- [x] Consistently extract base entities: **Title**, **Company**, **Location**, and **Description**.
- [x] Handle basic bot-prevention on standard job boards by spoofing standard `User-Agent` and `Accept` headers.
- [x] Gracefully degrade to a "Confidence Score" and prompt the user for manual data entry if extraction fails.
- [x] Easily parse standardized Semantic Web metadata (`application/ld+json` with `@type: "JobPosting"`).

## 4. What the Current Feature CAN NOT Do (Limitations)

Because the developer needs to extract *more* data (e.g., Salary, Experience Required, Remote Status, Tech Stack), it is critical to understand these limitations:

- [ ] **Cannot Execute JavaScript**: `axios` + `cheerio` only fetched the initial HTML payload sent by the server. If a modern Single Page Application (React/Vue/Angular) loads job details dynamically via an API call *after* the page loads, the extraction will fail entirely.
- [ ] **Cannot Bypass Advanced Anti-Bot Systems**: Services protected by aggressive Cloudflare Turnstile, DataDome, or reCAPTCHA will block the request, returning a `403 Forbidden` status code. 
- [ ] **Cannot Understand Unstructured Text Contextively**: It relies on strict DOM layout patterns and metadata tags. It cannot read a 5-paragraph job description and reliably extract "Requires 5 years of Python experience" or "Salary: $120k-$150k" without complex Regex which is brittle.
- [ ] **Does Not Extract Deep Metadata**: The current system ignores arrays of skills, benefits, company size, employment type (Full-time/Contract), and explicit salary bands unless they happen to be part of the main `description` text block.

## 5. Recommendations for Recreating & Extending

If the goal is to extract *more data* accurately from a wider variety of sources, consider the following upgrades when recreating this feature:

1. **Adopt a Headless Browser**: Replace `axios` + `cheerio` with **Puppeteer** or **Playwright**. This allows the scraper to execute JavaScript, wait for dynamic data to render, and bypass basic anti-bot checks.
2. **Integrate an LLM for Unstructured Parsing**: Instead of brittle Regex rules to pull deeper data (salary, skills), pass the raw extracted `innerText` of the page into a fast, cheap LLM (like GPT-4o-mini or Claude 3 Haiku) with a strict JSON schema prompt: *Extract the Salary Range, Required Experience Years, and Tech Stack from this text.*
3. **Enhance JSON-LD Targeting**: Most reputable job boards embed extensive metadata in `application/ld+json` tags adhering to `schema.org/JobPosting`. The recreation should deeply parse this JSON to effortlessly extract structured fields like `baseSalary`, `employmentType`, `qualifications`, and `remote`.
