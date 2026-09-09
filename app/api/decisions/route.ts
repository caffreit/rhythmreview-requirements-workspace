import { z } from "zod";
import { ActorSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { completeReplayReview, resolveProjectDecision } from "@/lib/workflow";
const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    kind: z.enum(["age", "retention"]),
    actor: ActorSchema,
  }),
  z.object({ action: z.literal("complete_replay"), actor: ActorSchema }),
]);
export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());
    return ok(
      await changeWorkspace((state) =>
        input.action === "complete_replay"
          ? completeReplayReview(state, input.actor)
          : resolveProjectDecision(state, input.kind, input.actor),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
