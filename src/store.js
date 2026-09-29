import fs from "node:fs";

const PATH = new URL("../processed.json", import.meta.url);

function load() {
  try {
    return new Set(JSON.parse(fs.readFileSync(PATH, "utf8")));
  } catch {
    return new Set();
  }
}

let done = load();
function save() {
  fs.writeFileSync(PATH, JSON.stringify([...done], null, 2));
}

export function isDone(key) {
  return done.has(key);
}
export function markDone(key) {
  done.add(key);
  save();
}
