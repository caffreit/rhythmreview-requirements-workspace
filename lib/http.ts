import { NextResponse } from "next/server";

export function ok<T>(body: T): NextResponse<T> {
  return NextResponse.json(body);
}
export function failure(error: unknown): NextResponse<{ error: string }> {
  const message =
    error instanceof Error
      ? error.message
      : "The request could not be completed.";
  const status = /not found/i.test(message) ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}
