import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchRemotiveOpenJobs,
  fetchArbeitnowOpenJobs,
  fetchOpenPlatformJobs,
  OPEN_ATS_BOARDS,
} from "./openPlatforms";

describe("Open Platforms ATS Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes Remotive open jobs", async () => {
    const mockRemotiveData = {
      jobs: [
        {
          id: 101,
          title: "Senior Full Stack Engineer (Node/React)",
          company_name: "Remotive Tech",
          candidate_required_location: "Worldwide",
          salary: "13 - 16 LPA",
          description: "<p>We are hiring a Node.js and React engineer. TypeScript required.</p>",
          url: "https://remotive.com/job/101",
          tags: ["react", "nodejs"],
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRemotiveData,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchRemotiveOpenJobs("React", 10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Senior Full Stack Engineer (Node/React)");
    expect(jobs[0].companyName).toBe("Remotive Tech");
    expect(jobs[0].remote).toBe(true);
    expect(jobs[0].salaryMin).toBe(1300000);
    expect(jobs[0].salaryMax).toBe(1600000);
    expect(jobs[0].skills).toContain("react");
  });

  it("normalizes Arbeitnow open tech jobs", async () => {
    const mockArbeitData = {
      data: [
        {
          slug: "software-engineer-de-42",
          title: "Software Engineer - Cloud Systems",
          company_name: "Berlin Cloud Labs",
          location: "Berlin, Germany",
          remote: true,
          description: "Python, Docker, Kubernetes system architecture. Salary $120,000 - $150,000.",
          url: "https://www.arbeitnow.com/jobs/software-engineer-de-42",
          tags: ["Python", "Docker"],
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockArbeitData,
    });
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await fetchArbeitnowOpenJobs(10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Software Engineer - Cloud Systems");
    expect(jobs[0].companyName).toBe("Berlin Cloud Labs");
    expect(jobs[0].remote).toBe(true);
    expect(jobs[0].skills).toContain("Python");
    expect(jobs[0].skills).toContain("Docker");
  });

  it("exports verified OPEN_ATS_BOARDS configuration", () => {
    expect(OPEN_ATS_BOARDS.workday.length).toBeGreaterThan(0);
    expect(OPEN_ATS_BOARDS.greenhouse.length).toBeGreaterThan(0);
    expect(OPEN_ATS_BOARDS.lever.length).toBeGreaterThan(0);
    expect(OPEN_ATS_BOARDS.ashby.length).toBeGreaterThan(0);

    const autodesk = OPEN_ATS_BOARDS.workday.find((w) => w.tenant === "autodesk");
    expect(autodesk).toBeDefined();
    expect(autodesk?.companyName).toBe("Autodesk");
  });
});
