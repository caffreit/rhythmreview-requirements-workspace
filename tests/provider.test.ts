import { describe, expect, it } from "vitest";
import { extractWithOpenAI } from "../lib/openai-provider";
import { createInitialState } from "../lib/seed";

describe("optional OpenAI adapter", () => {
  it("keeps replay available when no API key is configured", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      extractWithOpenAI(createInitialState().sources),
    ).rejects.toThrow(/Choose replay mode/);
    if (previous) process.env.OPENAI_API_KEY = previous;
  });
});
