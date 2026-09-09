import { FindingActionSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { disposeFinding } from "@/lib/workflow";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = FindingActionSchema.parse(await request.json());
    return ok(
      await changeWorkspace((state) => disposeFinding(state, id, action)),
    );
  } catch (error) {
    return failure(error);
  }
}
