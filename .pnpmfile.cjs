module.exports = {
  hooks: {
    readPackage(pkg, context) {
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
