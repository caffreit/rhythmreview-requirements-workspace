import { CandidateActionSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { decideCandidate } from "@/lib/workflow";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = CandidateActionSchema.parse(await request.json());
    return ok(
      await changeWorkspace((state) => decideCandidate(state, id, action)),
    );
  } catch (error) {
    return failure(error);
  }
}
