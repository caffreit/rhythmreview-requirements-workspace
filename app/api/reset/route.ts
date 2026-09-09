import { failure, ok } from "@/lib/http";
import { saveWorkspace } from "@/lib/repository";
import { resetWorkspace } from "@/lib/workflow";
export async function POST() {
  try {
    const state = resetWorkspace();
    await saveWorkspace(state);
    return ok(state);
  } catch (error) {
    return failure(error);
  }
}
