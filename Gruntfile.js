/*
 * angular-cache
 * http://jmdobry.github.io/angular-cache/
 *
 * Copyright (c) 2013-2015 Jason Dobry <http://jmdobry.github.io/angular-cache/>
 * Licensed under the MIT license. <https://github.com/jmdobry/angular-cache/blob/master/LICENSE>
 */
module.exports = function (grunt) {
  'use strict';

  require('time-grunt')(grunt);
  
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-karma-coveralls');

  var pkg = grunt.file.readJSON('package.json');

  // Project configuration.
  grunt.initConfig({
    pkg: pkg,
    clean: {
      dist: ['dist/'],
      coverage: ['coverage/']
    },
    ngAnnotate: {
        options: {
          singleQuotes: true
        },
        dist: {
          files: {
            'dist/ng-restful-collection.js': 'src/ng-restful-collection.js'
          }
        }
    },
    uglify: {
      main: {
        options: {
          report: 'min',
          sourceMap: true,
          sourceMapName: 'dist/ng-restful-collection.min.map',
        },
        files: {
          'dist/ng-restful-collection.min.js': ['dist/ng-restful-collection.js']
        }
      }
    },
    jshint: {
      options: {
        reporter: require('jshint-stylish'),
      },
      target: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      dev: {
        browsers: ['PhantomJS']
      },
      dist: {},
      min: {
        options: {
          files: [
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'dist/ng-restful-collection.min.js',
            'test/**/*.js'
          ]
        }
      }
    },
    coveralls: {
      options: {
        coverage_dir: 'coverage'
      }
    }
  });

  grunt.registerTask('test', [ 'build', 'jshint', 'karma:dist', 'karma:min' ]);
  grunt.registerTask('build', [ 'clean', 'ngAnnotate', 'uglify' ]);
  grunt.registerTask('default', [ 'build' ]);
};