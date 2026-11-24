module.exports = {
  hooks: {
    readPackage(pkg, context) {
      if (pkg.name === 'jwks-rsa' && pkg.dependencies && pkg.dependencies['jose']) {
        context.log(`Overriding jose in ${pkg.name}@${pkg.version} from ${pkg.dependencies['jose']} to 5.9.6`)
        pkg.dependencies['jose'] = '5.9.6'
      }
      if (pkg.dependencies && pkg.dependencies['@grpc/grpc-js']) {
        context.log(`Overriding @grpc/grpc-js in ${pkg.name}@${pkg.version} from ${pkg.dependencies['@grpc/grpc-js']} to ^1.14.7`)
        pkg.dependencies['@grpc/grpc-js'] = '^1.14.7'
      }
      if (pkg.dependencies && pkg.dependencies['minimatch']) {
        context.log(`Overriding minimatch in ${pkg.name}@${pkg.version} from ${pkg.dependencies['minimatch']} to ^11.0.1`)
        pkg.dependencies['minimatch'] = '^11.0.1'
      }
      return pkg
    },
  },
}
