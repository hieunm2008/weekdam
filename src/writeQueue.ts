export function createWriteQueue<T>(
  write: (uid: string, records: T[]) => Promise<void>,
): (uid: string, records: T[]) => Promise<void> {
  // Keep every chunk of one write ahead of later writes for the same account.
  const tails = new Map<string, Promise<void>>();
  return (uid, records) => {
    const next = (tails.get(uid) ?? Promise.resolve())
      .catch(() => {})
      .then(() => write(uid, records));
    tails.set(uid, next);
    const release = () => {
      if (tails.get(uid) === next) tails.delete(uid);
    };
    void next.then(release, release);
    return next;
  };
}
