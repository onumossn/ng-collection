module.exports = function (config) {
  config.set({
    basePath: './',
    frameworks: ['jasmine'],
    browsers: ['Chrome', 'Firefox', 'PhantomJS'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'dist/ng-restful-collection.js',
      'tests/**/*.js'
    ],
    captureTimeout: 60000,
    colors: true,
    logLevel: config.LOG_INFO,
    port: 9876,
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-phantomjs-launcher',
      'karma-coverage'
    ],
    runnerPort: 9100,
    singleRun: true,
    autoWatch: false,
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    },
    preprocessors: {
      'dist/ng-restful-collection.js': ['coverage']
    },
    reporters: ['coverage']
  });
};