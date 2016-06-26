var path = require( 'path' );
var webpack = require( 'webpack' );

module.exports = {
    entry  : './es6/main.js',
    output : {
        path    : 'chrome-app/js/',
        filename: 'bundle.js'
    },
    module : {
        loaders: [
            {
                loader: 'babel-loader', // see .babelrc for more config
                test  : path.join( __dirname, 'es6' ),
            }
        ]
    },
    resolve: {
        alias: {
            'jquery': path.join( __dirname, 'chrome-app/vendor/jquery-2.2.3.min.js' ),
            'spectrum': path.join( __dirname, 'chrome-app/vendor/spectrum/spectrum.js' )
        }
    },
    plugins: [
        // Avoid publishing files when compilation fails
        new webpack.NoErrorsPlugin()
    ],
    stats  : {
        // Nice colored output
        colors: true
    },
    // Create Sourcemaps for the bundle
    devtool: 'source-map'
};
