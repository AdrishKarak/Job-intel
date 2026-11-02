import { describe, it, expect, vi } from "vitest";
import { fetchAshbyJobs } from "./ashby";
import { fetchSmartRecruitersJobs } from "./smartrecruiters";
import { fetchWorkableJobs } from "./workable";
import { fetchWorkdayJobs } from "./workday";
import { scrapeJobsWithFirecrawl } from "./firecrawl";

describe("ATS Connectors Suite (Phase 8)", () => {
  it("normalizes Ashby job postings", async () => {
    const mockResponse = {
      jobs: [
        {
          id: "ashby_1",
          title: "Senior Full Stack Engineer",
          location: "San Francisco, CA",
          isRemote: true,
          jobUrl: "https://jobs.ashbyhq.com/linear/ashby_1",
          descriptionPlain: "Looking for TypeScript and React experts. Salary: ₹16,00,000 - ₹20,00,000.",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchAshbyJobs("linear", "Linear");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Senior Full Stack Engineer");
    expect(jobs[0].companyName).toBe("Linear");
    expect(jobs[0].remote).toBe(true);
    expect(jobs[0].source).toBe("ASHBY");
    expect(jobs[0].salaryMin).toBe(1600000);
    expect(jobs[0].salaryMax).toBe(2000000);
    expect(jobs[0].skills).toContain("TypeScript");
    expect(jobs[0].skills).toContain("React");
  });

  it("normalizes SmartRecruiters postings", async () => {
    const mockResponse = {
      content: [
        {
          id: "sr_1",
          name: "Backend Infrastructure Engineer (Go/Kubernetes)",
          location: {
            city: "Stockholm",
            country: "Sweden",
            remote: true,
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchSmartRecruitersJobs("Spotify", "Spotify");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Backend Infrastructure Engineer (Go/Kubernetes)");
    expect(jobs[0].location).toBe("Stockholm, Sweden");
    expect(jobs[0].remote).toBe(true);
    expect(jobs[0].source).toBe("SMARTRECRUITERS");
    expect(jobs[0].skills).toContain("Go");
    expect(jobs[0].skills).toContain("Kubernetes");
  });

  it("normalizes Workable postings", async () => {
    const mockResponse = {
      results: [
        {
          shortcode: "WKBL123",
          title: "DevOps Engineer",
          location: { city: "London", country: "United Kingdom" },
          remote: true,
          url: "https://apply.workable.com/basecamp/j/WKBL123/",
          description: "Hands-on experience with Docker and AWS required.",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchWorkableJobs("basecamp", "Basecamp");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].externalId).toBe("WKBL123");
    expect(jobs[0].remote).toBe(true);
    expect(jobs[0].source).toBe("WORKABLE");
    expect(jobs[0].skills).toContain("Docker");
    expect(jobs[0].skills).toContain("AWS");
  });

  it("normalizes Workday postings", async () => {
    const mockResponse = {
      total: 1,
      jobPostings: [
        {
          title: "Member of Technical Staff - Machine Learning",
          locationsText: "San Francisco, California",
          externalPath: "/job/MTS-ML-1234",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchWorkdayJobs("salesforce:External", "Salesforce");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Member of Technical Staff - Machine Learning");
    expect(jobs[0].source).toBe("WORKDAY");
    expect(jobs[0].location).toBe("San Francisco, California");
    expect(jobs[0].applicationUrl).toContain("salesforce.wd1.myworkdayjobs.com");
  });

  it("scrapes and normalizes custom career portals via Firecrawl fallback", async () => {
    const html = `
      <html>
        <body>
          <h1>Open Engineering Roles at Startup</h1>
          <p>We are hiring a Senior Software Engineer to build our platform with Python and PostgreSQL.</p>
          <p>Location: Remote. Compensation: $150k - $180k.</p>
        </body>
      </html>
    `;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => html,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await scrapeJobsWithFirecrawl("https://example.com/careers", "Startup");
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].companyName).toBe("Startup");
    expect(jobs[0].source).toBe("FIRECRAWL");
    expect(jobs[0].applicationUrl).toBe("https://example.com/careers");
  });
});
