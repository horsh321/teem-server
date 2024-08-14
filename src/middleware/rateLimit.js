import { rateLimit } from "express-rate-limit";

export const limitRequests = rateLimit({
  windowMs: 10 * 10 * 1000, //100secs
  max: 5, //limit to 5 requests per 100secs
  statusCode: 429,
});

export default limitRequests;
