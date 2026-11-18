const fs = require('node:fs/promises');
const path = require('node:path');
const { STATIC_FILES } = require('./server');

async function build() {
  const outputDirectory = path.join(__dirname, 'dist');
  await fs.mkdir(outputDirectory, { recursive: true });

  await Promise.all(STATIC_FILES.map((filename) => (
    fs.copyFile(
      path.join(__dirname, filename),
      path.join(outputDirectory, filename)
    )
  )));

  console.log(`Copied ${STATIC_FILES.length} website files to dist/.`);
}

build().catch((error) => {
  console.error('Website build failed:', error);
  process.exitCode = 1;
});
