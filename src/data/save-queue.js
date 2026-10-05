export function createSaveQueue(save) {
  let tail = Promise.resolve();
  return (document) => {
    tail = tail.catch(() => undefined).then(() => save(document));
    return tail;
  };
}
