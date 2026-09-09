import { failure, ok } from "@/lib/http";
import { readWorkspace } from "@/lib/repository";
export async function GET() {
  try {
    return ok(await readWorkspace());
  } catch (error) {
    return failure(error);
  }
}
