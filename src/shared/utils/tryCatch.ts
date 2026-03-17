type Success<T> = {
  ok: true;
  data: T;
}
type Failure<E = string> = {
  ok: false;
  error: E;
}
export type Result<T, E = string> = Success<T> | Failure<E>;

export async function tryCatch<T>(
  promise: Promise<T>,
): Promise<Result<T, Error>> {
  try {
    const data = await promise;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}