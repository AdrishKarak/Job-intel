import * as XLSX from "xlsx";
import { prisma } from "@repo/db";

export interface JobExportRow {
  Title: string;
  Company: string;
  Location: string;
  Remote: string;
  Compensation: string;
  "Match Score": string;
  Status: string;
  "Apply Link": string;
  "Application URL": string;
  "Discovered Date": string;
}

/**
 * Generates an Excel (.xlsx) buffer containing user's tracked jobs (strictly scoped by userId)
 * with clickable application hyperlinks on every row.
 */
export async function generateJobsExcel(
  userId: string,
  db: any = prisma
): Promise<Buffer> {
  const jobs = await db.job.findMany({
    where: { userId },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { discoveredAt: "desc" },
  });

  const rows: JobExportRow[] = (jobs as any[]).map((job) => {
    let comp = "Not specified";
    if (job.salaryMin && job.salaryMax) {
      comp = `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`;
    } else if (job.salaryMin) {
      comp = `From $${job.salaryMin.toLocaleString()}`;
    } else if (job.salaryMax) {
      comp = `Up to $${job.salaryMax.toLocaleString()}`;
    }

    return {
      Title: job.title,
      Company: job.company.name,
      Location: job.location || (job.remote ? "Remote" : "N/A"),
      Remote: job.remote ? "Yes" : "No",
      Compensation: comp,
      "Match Score": job.matchScore ? `${Math.round(job.matchScore)}%` : "Unscored",
      Status: job.status,
      "Apply Link": job.applicationUrl || "N/A",
      "Application URL": job.applicationUrl || "N/A",
      "Discovered Date": new Date(job.discoveredAt).toISOString().split("T")[0],
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set explicit clickable hyperlinks on Apply Link and Application URL cells
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = 1; R <= range.e.r; ++R) {
      const job = (jobs as any[])[R - 1];
      if (job && job.applicationUrl && job.applicationUrl.startsWith("http")) {
        const applyLinkCell = XLSX.utils.encode_cell({ c: 7, r: R });
        if (worksheet[applyLinkCell]) {
          worksheet[applyLinkCell].l = { Target: job.applicationUrl, Tooltip: "Click to Apply" };
        }
        const appUrlCell = XLSX.utils.encode_cell({ c: 8, r: R });
        if (worksheet[appUrlCell]) {
          worksheet[appUrlCell].l = { Target: job.applicationUrl, Tooltip: "Click to Apply" };
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Discovered Jobs");

  // Generate binary XLSX buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return excelBuffer;
}
