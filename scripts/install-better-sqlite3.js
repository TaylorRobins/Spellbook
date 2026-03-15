/**
 * Downloads prebuilt better-sqlite3 binaries for the installed Electron version.
 * Runs automatically after `npm install` via the postinstall script.
 *
 * better-sqlite3 uses N-API which is ABI-stable, so a single prebuilt binary
 * works across multiple Electron minor versions of the same major module ABI.
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const zlib = require('zlib')

const BETTER_SQLITE3_VERSION = '12.8.0'
// Electron 32.x uses module ABI v125
const ELECTRON_MODULE_ABI = '125'
const PLATFORM = process.platform // win32, darwin, linux
const ARCH = process.arch // x64, arm64, ia32

const BINARY_DIR = path.join(__dirname, '../node_modules/better-sqlite3/build/Release')
const BINARY_PATH = path.join(BINARY_DIR, 'better_sqlite3.node')

// Check if binary already exists and loads correctly
if (fs.existsSync(BINARY_PATH)) {
  try {
    require('../node_modules/better-sqlite3')
    console.log('better-sqlite3: prebuilt binary already present and working.')
    process.exit(0)
  } catch {
    console.log('better-sqlite3: existing binary is broken, re-downloading...')
  }
}

const filename = `better-sqlite3-v${BETTER_SQLITE3_VERSION}-electron-v${ELECTRON_MODULE_ABI}-${PLATFORM}-${ARCH}.tar.gz`
const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/${filename}`

console.log(`better-sqlite3: downloading prebuilt binary for Electron (${PLATFORM}-${ARCH})...`)

fs.mkdirSync(BINARY_DIR, { recursive: true })

const tmpFile = path.join(BINARY_DIR, 'prebuilt.tar.gz')

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest)
  function get(url) {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return get(res.headers.location)
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        return cb(new Error(`HTTP ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(cb))
    }).on('error', (err) => {
      file.close()
      fs.existsSync(dest) && fs.unlinkSync(dest)
      cb(err)
    })
  }
  get(url)
}

download(url, tmpFile, (err) => {
  if (err) {
    console.error(`better-sqlite3: failed to download prebuilt binary: ${err.message}`)
    console.error('You may need to install Python and Visual Studio Build Tools to compile from source.')
    console.error('See: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/compilation.md')
    fs.existsSync(tmpFile) && fs.unlinkSync(tmpFile)
    process.exit(0) // Don't fail the install — app will show error at runtime
    return
  }

  // Extract using tar (available on Windows 10+ and all Unix)
  try {
    // Use Windows System32 tar to avoid Git's tar which can't handle drive-letter paths
    const tarExe = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'tar'
    execSync(`"${tarExe}" -xzf "${tmpFile}" -C "${BINARY_DIR}" --strip-components=2`, { stdio: 'pipe', shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh' })
    fs.unlinkSync(tmpFile)
    console.log('better-sqlite3: prebuilt binary installed successfully.')
  } catch (e) {
    console.error(`better-sqlite3: extraction failed: ${e.message}`)
    fs.existsSync(tmpFile) && fs.unlinkSync(tmpFile)
  }
})
