import { llmsText, textResponse } from "@/lib/server/llms";

export const dynamic = "force-dynamic";

export async function GET() {
  return textResponse(await llmsText(true));
}
