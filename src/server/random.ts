import { randomBytes, randomInt } from "crypto";

export function randomSlugSuffix(length = 6) {
  const size = Math.max(1, Math.ceil(length / 2));
  return randomBytes(size).toString("hex").slice(0, length);
}

export function randomNumericCode(length = 6) {
  const size = Math.max(1, length);
  let output = "";
  for (let index = 0; index < size; index += 1) {
    output += String(randomInt(0, 10));
  }
  return output;
}

export function randomOpaqueToken(length = 16) {
  const size = Math.max(1, Math.ceil(length / 2));
  return randomBytes(size).toString("hex").slice(0, length);
}
