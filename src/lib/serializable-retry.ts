/** Prisma's code for a Postgres serialization failure (40001) in a Serializable transaction. */
export const SERIALIZATION_FAILURE = "P2034";

export function isSerializationFailure(err: unknown) {
  return (err as { code?: unknown } | null)?.code === SERIALIZATION_FAILURE;
}

/**
 * Runs `transaction` again when Postgres aborts it for a serialization conflict. Under Serializable,
 * uploads from different guests landing at the same moment can conflict with each other even though
 * they touch different rows; a short random wait and a retry gets them through. Any other error, or
 * running out of attempts, is thrown as is.
 */
export async function withSerializableRetry<T>(
  transaction: () => Promise<T>,
  {
    attempts = 5,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    random = Math.random,
  }: { attempts?: number; sleep?: (ms: number) => Promise<void>; random?: () => number } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await transaction();
    } catch (err) {
      if (!isSerializationFailure(err) || attempt >= attempts) throw err;
      // 20–80 ms, growing with each attempt, randomized so the colliding requests spread out.
      await sleep(Math.round((20 + random() * 60) * attempt));
    }
  }
}
