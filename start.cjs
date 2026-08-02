// CommonJS entry for Hostinger/Passenger. Keeps package.json free of
// "type":"module" so Hostinger's preload-timestamp.js can be required().
async function main() {
  await import("./src/index.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
