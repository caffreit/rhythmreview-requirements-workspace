import { z } from "zod";
import { failure, ok } from "@/lib/http";
import { draftWithOpenAI } from "@/lib/openai-provider";
import { changeWorkspace } from "@/lib/repository";
import { createDrafts, createLiveDrafts } from "@/lib/workflow";
const Input = z.object({ mode: z.enum(["replay", "live"]) });
export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());
    return ok(
      await changeWorkspace(async (state) =>
        input.mode === "replay"
          ? createDrafts(state, "replay")
          : createLiveDrafts(state, await draftWithOpenAI(state)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
