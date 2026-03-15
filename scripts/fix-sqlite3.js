const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BINARY_DIR = path.join(__dirname, '../node_modules/better-sqlite3/build/Release')
const tmpFile = path.join(BINARY_DIR, 'prebuilt.tar.gz')
const url = 'https://github.com/WiseLibs/better-sqlite3/releases/download/v12.8.0/better-sqlite3-v12.8.0-electron-v125-win32-x64.tar.gz'

fs.mkdirSync(BINARY_DIR, { recursive: true })

function get(url, dest, cb) {
  const file = fs.createWriteStream(dest)
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      return get(res.headers.location, dest, cb)
    }
    if (res.statusCode !== 200) {
      file.close()
      return cb(new Error('HTTP ' + res.statusCode))
    }
    let bytes = 0
    res.on('data', (d) => { bytes += d.length })
    res.pipe(file)
    file.on('finish', () => { file.close(); console.log('Downloaded', bytes, 'bytes'); cb(null) })
  }).on('error', cb)
}

console.log('Downloading better-sqlite3 v12.8.0 (electron ABI 125)...')

get(url, tmpFile, (err) => {
  if (err) { console.error('Download failed:', err.message); process.exit(1) }
  console.log('Extracting...')
  try {
    // Use Windows System32 tar to avoid Git's tar which can't handle drive-letter paths
    execSync(`C:\\Windows\\System32\\tar.exe -xzf "${tmpFile}" -C "${BINARY_DIR}" --strip-components=2`, { stdio: 'pipe', shell: 'cmd.exe' })
    fs.unlinkSync(tmpFile)
    console.log('Done — better_sqlite3.node installed.')
  } catch (e) {
    console.error('Extraction failed:', e.stderr ? e.stderr.toString() : e.message)
  }
})
