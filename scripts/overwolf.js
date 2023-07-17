const path = require('path'),
  fs = require('fs'),
  semver = require('semver'),
  zip = require('zip-a-folder')

const { exec } = require('child_process')

class OverwolfWebpackPlugin {
  apply (compiler) {
    compiler.hooks.afterEmit.tapPromise(
      'OverwolfWebpackPlugin',
      async compilation => {
        const makeOpkPrefix = 'make-opk',
          makeOpkPrefixWithArg = `${makeOpkPrefix}=`

        try {
          const arg = process.argv.find(v => v.startsWith(makeOpkPrefix))

          if (!arg) {
            return
          }

          if (
            arg.length > makeOpkPrefix.length &&
            arg.startsWith(makeOpkPrefixWithArg)
          ) {
            const suffix = arg.replace(makeOpkPrefixWithArg, '')

            await makeOPK(suffix || '')
          } else {
            await makeOPK()
          }
        } catch (e) {
          handleErrors(e, compilation)
        }
      }
    )
  }
}

const overwolfMaybeVersionChange = async () => {
  const setVersionPrefix = 'version='

  const arg = process.argv.find(v => v.startsWith(setVersionPrefix))

  if (arg && arg.length > setVersionPrefix.length) {
    const versionArg = arg.replace(setVersionPrefix, '')

    if (versionArg && isValidVersionArg(versionArg)) {
      await bumpPackageVersion(versionArg)
      await updateManifestVersion()
    }
  }
}

const bumpPackageVersion = bumpType => {
  console.log(`Bumping version: ${bumpType}`)

  const cmd = `npm version ${bumpType} --no-git-tag-version --allow-same-version`

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (stdout) {
        console.log(`${cmd}: stdout:`, stdout)
      }

      if (stderr) {
        console.error(`${cmd}: stderr:`, stderr)
      }

      if (error === null) {
        setTimeout(resolve, 2500)
        return
      }

      if (error instanceof Error) {
        console.error(`${cmd}: error:`, error)
        reject(error)
      }
    })
  })
}

const updateManifestVersion = async () => {
  const packagePath = path.resolve(__dirname, '../package.json'),
    manifestPath = path.resolve(__dirname, '../public/manifest.json')

  const [pkg, manifest] = await Promise.all([
    readFile(packagePath),
    readFile(manifestPath)
  ])

  if (!pkg) {
    throw new Error('could not read package.json')
  }

  if (!manifest) {
    throw new Error('could not read manifest.json')
  }

  manifest.meta.version = pkg.version

  console.log(`Updating manifest version: ${pkg.version}`)

  const manifestJSON = JSON.stringify(manifest, null, '  ')

  await writeFile(manifestPath, manifestJSON)
}

const makeOPK = async (suffix = '') => {
  const manifestPath = path.resolve(__dirname, '../public/manifest.json'),
    dist = path.join(__dirname, '../dist/')

  const manifest = await readFile(manifestPath)

  if (!manifest) {
    throw new Error('could not read manifest.json')
  }

  const { name, version } = manifest.meta

  const opkPath = path.join(
    __dirname,
    '../',
    `${name}-${version}${suffix ? `.${suffix}` : ''}.zip`
  )

  await deleteFile(opkPath)

  await zip.zip(dist, opkPath)
}

const readFile = filePath => {
  return new Promise(resolve => {
    fs.readFile(filePath, (err, response) => {
      try {
        resolve(err ? null : JSON.parse(response))
      } catch (e) {
        resolve(null)
      }
    })
  })
}

const writeFile = (filePath, content) => {
  return new Promise(resolve => {
    fs.writeFile(filePath, content, resolve)
  })
}

const deleteFile = filePath => {
  return new Promise(resolve => {
    fs.unlink(filePath, resolve)
  })
}

const handleErrors = (error, compilation) => {
  error = new Error(error)
  compilation.errors.push(error)
  throw error
}

const isValidVersionArg = version => {
  switch (version) {
    case 'major':
    case 'minor':
    case 'patch':
      return true
    default:
      return Boolean(semver.valid(version) && !semver.prerelease(version))
  }
}

module.exports.overwolfMaybeVersionChange = overwolfMaybeVersionChange
module.exports.OverwolfWebpackPlugin = OverwolfWebpackPlugin
