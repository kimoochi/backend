import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { asUser, asOwner, pool, ALICE, BOB, CAROL, ACME, GLOBEX } from "./helpers";

describe("notes RLS policies", () => {
  beforeAll(async () => {
    // Clear any existing notes and seed notes as database owner (RLS bypassed)
    await asOwner("delete from notes");
    
    await asOwner(
      "insert into notes (group_id, author_id, body) values ($1, $2, $3)",
      [ACME, ALICE, "Alice's Acme Note"]
    );
    await asOwner(
      "insert into notes (group_id, author_id, body) values ($1, $2, $3)",
      [GLOBEX, BOB, "Bob's Globex Note"]
    );
  });

  afterAll(async () => {
    // Clean up notes and close database connection pool
    await asOwner("delete from notes").catch(() => {});
    await pool.end();
  });

  describe("read isolation", () => {
    it("allows a member of a group to see only their group's notes", async () => {
      // Alice (Acme member) should only see Acme note
      const aliceNotes = await asUser(ALICE, async (q) => {
        const res = await q("select body from notes");
        return res.rows.map((r) => r.body);
      });
      expect(aliceNotes).toContain("Alice's Acme Note");
      expect(aliceNotes).not.toContain("Bob's Globex Note");

      // Bob (Globex member) should only see Globex note
      const bobNotes = await asUser(BOB, async (q) => {
        const res = await q("select body from notes");
        return res.rows.map((r) => r.body);
      });
      expect(bobNotes).toContain("Bob's Globex Note");
      expect(bobNotes).not.toContain("Alice's Acme Note");
    });

    it("allows a member of multiple groups to see notes from all their groups", async () => {
      // Carol is a member of both Acme and Globex
      const carolNotes = await asUser(CAROL, async (q) => {
        const res = await q("select body from notes");
        return res.rows.map((r) => r.body);
      });
      expect(carolNotes).toContain("Alice's Acme Note");
      expect(carolNotes).toContain("Bob's Globex Note");
      expect(carolNotes.length).toBe(2);
    });
  });

  describe("insert isolation", () => {
    it("allows inserting a note into a group the user belongs to", async () => {
      // Alice inserts into Acme
      await asUser(ALICE, async (q) => {
        const res = await q(
          "insert into notes (group_id, author_id, body) values ($1, $2, $3) returning body",
          [ACME, ALICE, "New Alice Note"]
        );
        expect(res.rows[0].body).toBe("New Alice Note");
      });
    });

    it("prevents inserting a note into a group the user does not belong to", async () => {
      // Alice tries to insert into Globex
      await asUser(ALICE, async (q) => {
        await expect(
          q(
            "insert into notes (group_id, author_id, body) values ($1, $2, $3)",
            [GLOBEX, ALICE, "Alice hacked note"]
          )
        ).rejects.toThrow();
      });

      // Bob tries to insert into Acme
      await asUser(BOB, async (q) => {
        await expect(
          q(
            "insert into notes (group_id, author_id, body) values ($1, $2, $3)",
            [ACME, BOB, "Bob hacked note"]
          )
        ).rejects.toThrow();
      });
    });

    it("prevents a user from inserting a note impersonating another user", async () => {
      // Alice tries to insert into Acme, but setting author_id to Bob
      await asUser(ALICE, async (q) => {
        await expect(
          q(
            "insert into notes (group_id, author_id, body) values ($1, $2, $3)",
            [ACME, BOB, "Impersonating note"]
          )
        ).rejects.toThrow();
      });
    });
  });
});
