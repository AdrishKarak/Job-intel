import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ai-job-intelligence",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
