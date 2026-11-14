import { z } from "zod";

export const productEnquiryInputSchema = z.object({
  productListingId: z.string().uuid(),
  visitorName: z.string().trim().min(1).max(120),
  visitorEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  visitorPhone: z.string().trim().min(3).max(40).regex(/^(?=.*\d)[+0-9().\s-]+$/, "Enter a valid phone number."),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
}).strict();
