import { WorkflowActionSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { advanceWorkflow } from "@/lib/workflow";
export async function POST(request: Request) {
  try {
    const action = WorkflowActionSchema.parse(await request.json());
    return ok(await changeWorkspace((state) => advanceWorkflow(state, action)));
  } catch (error) {
    return failure(error);
  }
}
