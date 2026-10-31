# User Stories

Organized by feature area. Format: *As a [user], I want [capability], so that [benefit].*

## Onboarding & Profile

1. As a new user, I want to sign up with email/OAuth, so that I can access the platform securely.
2. As a new user, I want to upload my resume once, so that I don't have to manually enter my experience and skills.
3. As a user, I want to review and edit the skills/experience extracted from my resume, so that I can correct any parsing mistakes before matching begins.
4. As a user, I want to manually add skills not present in my resume (e.g. "Kafka", "Docker"), so that my profile reflects skills I have but haven't formally used at work yet.
5. As a user, I want to set my preferred roles, locations, minimum salary, and remote preference, so that job matching reflects what I'm actually looking for.
6. As a user, I want to re-upload an updated resume later, so that my profile stays current as I gain experience.
7. As a user, I want to preview what would change before an updated resume overwrites my profile, so that I don't lose manually-added information by accident.
8. As a user, I want my original resume file deleted after parsing, so that I know my sensitive personal document isn't stored indefinitely.

## Job Discovery & Matching

9. As a user, I want the system to automatically find jobs from many companies and platforms, so that I don't have to check each one manually.
10. As a user, I want every job to show a match score, so that I can quickly prioritize which ones to review.
11. As a user, I want to see which of my skills matched a job and which are missing, so that I understand *why* I got the score I did.
12. As a user, I want a plain-language explanation of my match score, so that I don't have to interpret raw numbers myself.
13. As a user, I want newly discovered jobs to appear without me having to refresh or re-search, so that I'm not the one driving discovery.

## Application Tracking (CRM)

14. As a user, I want to see all my jobs in a filterable, sortable table, so that I can manage a large volume of opportunities without losing track.
15. As a user, I want to filter jobs by role, location, company, salary, status, and match score, so that I can focus on what matters to me right now.
16. As a user, I want to update a job's status (Saved, Applied, OA Received, OA Cleared, Interview Scheduled, Interview Cleared, Offer, Rejected, Ghosted), so that I have an accurate, current pipeline view.
17. As a user, I want to see the history of status changes for a job, so that I can recall when I applied or when I heard back.
18. As a user, I want jobs older than a certain window to age out automatically, so that my list doesn't fill up with stale postings.

## Skill Gap & Growth

19. As a user, I want to see my most commonly missing skills across matched jobs, so that I know what to prioritize learning.
20. As a user, I want an estimate of how much learning a given skill might improve my match rate, so that I can decide if it's worth the time investment.

## Dashboard & Reporting

21. As a user, I want an overview dashboard showing jobs found today, applications, interviews, and offers, so that I can gauge my search progress at a glance.
22. As a user, I want charts showing jobs found per day and applications by status, so that I can spot trends in my search.
23. As a user, I want a distribution of my match scores, so that I understand how well the current job market aligns with my profile.
24. As a user, I want a recent activity feed, so that I can see what's happened without digging through the jobs table.
25. As a user, I want a daily email report summarizing new jobs, best matches, skill gaps, and status changes, so that I stay informed without opening the app every day.
26. As a user, I want to export my jobs/applications to Excel, so that I can share or archive my search progress outside the platform.

## Non-functional / trust stories

27. As a user, I want my data (profile, jobs, reports) to be visible only to me, so that my job search remains private.
28. As a user, I want the system to handle a day with zero new jobs gracefully (e.g. still send a report saying so), so that I don't wonder if something is broken.
