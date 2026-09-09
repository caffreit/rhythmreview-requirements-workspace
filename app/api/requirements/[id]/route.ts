import { z } from "zod";
import { ActorSchema, RequirementActionSchema } from "@/lib/domain";
import { failure, ok } from "@/lib/http";
import { changeWorkspace } from "@/lib/repository";
import { applyCanonicalWording, updateRequirement } from "@/lib/workflow";
const Canonical = z.object({
  operation: z.literal("canonical"),
  actor: ActorSchema,
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const canonical = Canonical.safeParse(body);
    return ok(
      await changeWorkspace((state) =>
        canonical.success
          ? applyCanonicalWording(state, id, canonical.data.actor)
          : updateRequirement(state, id, RequirementActionSchema.parse(body)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
