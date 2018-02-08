const gulp = require( 'gulp' );
const sass = require( 'gulp-sass' );
var tslint = require( 'gulp-tslint' );
const webpack = require( 'webpack' );
const ts = require( "gulp-typescript" );
const tsProject = ts.createProject( 'tsconfig-server.json', { noImplicitAny: true } );
const tsLintProj = ts.createProject( 'tsconfig-lint.json' );
const browserSync = require( 'browser-sync' ).create();
const fs = require( 'fs' );
var spawn = require( 'child_process' );

const modepressJson = JSON.parse( fs.readFileSync( './modepress.json', { encoding: 'utf8' } ) );

function buildStatics() {
  return gulp.src( './src/static/**/*' )
    .pipe( gulp.dest( './dist/client/' ) );
};

/**
 * Builds the client TS code
 */
function buildClient( callback ) {
  webpack( require( './webpack.config.js' ), function( err, stats ) {
    if ( err )
      throw err;

    callback();
  } );
}

/**
 * Builds the server ts code
 */
function buildServer() {
  let didError = false;
  const tsResult = tsProject.src()
    .pipe( tsProject() )
    .on( 'error', function( error ) {
      didError = true;
    } );

  return tsResult.js.pipe( gulp.dest( './dist/server' ) )
    .on( 'end', function() {
      if ( didError )
        throw new Error( 'There were build errors' );
    } );
}

/**
 * Watches the source files and reloads a browsersync page on successful compilation
 */
function startWatchClient( callback ) {

  // returns a Compiler instance
  const compiler = webpack( require( './webpack.config.js' ) );

  compiler.watch( { aggregateTimeout: 300, poll: true }, function( err, stats ) {

    console.clear();
    console.log( '[webpack:build]', stats.toString( {
      chunks: false, // Makes the build much quieter
      colors: true
    } ) );

    if ( err )
      return;

    var jsonStats = stats.toJson();

    if ( jsonStats.errors.length > 0 || jsonStats.warnings.length > 0 )
      return;
    else {
      console.info( 'Compiled successfully!' );
      browserSync.reload();
    }
  } );
}

/**
 * Watches the source files and reloads the server on successful compilation
 */
function startWatchServer() {

  let existingProc = runServer();

  gulp.watch( './src/**/*', ( done ) => {

    let error = false;

    const tsResult = tsProject.src()
      .pipe( tsProject() )
      .on( 'error', function() {
        error = true;
      } );

    tsResult.js.pipe( gulp.dest( './dist/server' ) )
      .on( 'end', function() {
        if ( existingProc )
          existingProc.kill();

        if ( !error ) {
          existingProc = runServer();
        }

        done();
      } );
  } );
}

/**
 * Starts a child process that runs the modepress server
 */
function runServer() {
  let prc = spawn.spawn( 'node', [ "./dist/main.js", "--config=./config.json", "--numThreads=1", "--logging=true" ], { cwd: '../../' } );
  prc.stdout.setEncoding( 'utf8' );
  prc.stderr.setEncoding( 'utf8' );
  prc.stdout.on( 'data', function( data ) {
    var str = data.toString();
    console.log( str );
  } );

  prc.stderr.on( 'data', function( data ) {
    var str = data.toString();
    console.error( str );
  } );

  prc.on( 'close', function( code ) {
    console.error( 'Server closed prematurely' );
  } );

  return prc;
}

/**
 * Builds any sass files
 */
function buildSass() {
  return gulp.src( './src/main.scss' )
    .pipe( sass().on( 'error', sass.logError ) )
    .pipe( gulp.dest( './dist/client/css' ) );
}

/**
 * Notifies of any lint errors
 */
function lint() {
  return tsLintProj.src()
    .pipe( tslint( {
      configuration: 'tslint.json',
      formatter: 'verbose'
    } ) )
    .pipe( tslint.report( {
      emitError: true
    } ) )
}

/**
 * Initializes browsersync
 */
function initBrowserSync( callback ) {
  browserSync.init( {
    proxy: 'localhost:' + modepressJson.server.port,
    port: modepressJson.server.port
  } );

  callback();
}

gulp.task( 'build-client', buildClient );
gulp.task( 'build-server', buildServer );
gulp.task( 'build', gulp.series( buildServer, gulp.parallel( lint, buildClient, buildSass, buildStatics ), ) );
gulp.task( 'default', gulp.series( buildServer, gulp.parallel( lint, buildClient, buildSass, buildStatics ), ) );
gulp.task( 'watch-client', gulp.series( initBrowserSync, startWatchClient ) );
gulp.task( 'watch-server', startWatchServer );
