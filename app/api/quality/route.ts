import { z } from "zod";
import { ActorSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { runQualityReview } from "@/lib/workflow";
const Input = z.object({ actor: ActorSchema });
export async function POST(request: Request) {
  try {
    const parsed = Input.parse(await request.json());
    return ok(
      await changeWorkspace((state) => runQualityReview(state, parsed.actor)),
    );
  } catch (error) {
    return failure(error);
  }
}
