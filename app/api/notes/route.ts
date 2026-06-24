import { NextRequest, NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase";
import { z } from "zod";

const createNoteSchema = z.object({
  group_id: z.string().uuid({ message: "group_id must be a valid UUID" }),
  body: z.string().min(1, { message: "body must not be empty" }),
});

/**
 * GET /api/notes
 * Returns the notes the caller is allowed to see based on their group memberships.
 */
export async function GET(req: NextRequest) {
  const supabase = createUserClient(req);

  const { data, error } = await supabase
    .from("notes")
    .select("id, group_id, author_id, body, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data });
}

/**
 * POST /api/notes
 * Creates a new note. Validates input format with Zod and enforces group membership via RLS.
 */
export async function POST(req: NextRequest) {
  const supabase = createUserClient(req);

  // Validate request JSON format
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate fields with Zod
  const validation = createNoteSchema.safeParse(jsonBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { group_id, body } = validation.data;

  const insertPayload = { group_id, body };

  const { data, error } = await supabase
    .from("notes")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    // Map Row-Level Security policy violations (insufficient privilege / code 42501) to 403 Forbidden
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
