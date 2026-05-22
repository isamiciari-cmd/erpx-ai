function readPackage(pkg, context) {
  // Allow build scripts for these packages
  if (pkg.name === '@tailwindcss/oxide') {
    pkg.scripts = pkg.scripts || {};
  }
  if (pkg.name === 'esbuild') {
    pkg.scripts = pkg.scripts || {};
  }
  if (pkg.name === 'protobufjs') {
    pkg.scripts = pkg.scripts || {};
  }
  if (pkg.name === 're2') {
    pkg.scripts = pkg.scripts || {};
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
}
