module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.pname %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
            'public/build/apiClient.js': 'apiClient.js',
            'public/build/apiuser.js': 'apiuser.js',
            'public/build/backtrack.js': 'backtrack.js',
            'public/build/designer/designer.js':'designer/designer.js',
            'public/build/maze.js': 'maze.js',
            'public/build/mazeMenu.js': 'mazeMenu.js',
            'public/build/mazeModel.js': 'mazeModel.js',
            'public/build/mazeRender.js': 'mazeRender.js',
            'public/build/remoteDB.js': 'remoteDB.js',
            'public/build/trailModel.js': 'trailModel.js'
        }
      }
    },
    copy: {
        build:{
            files: [
            {//images
                cwd:'.',
                src:'images/**/*',
                dest:'public/',
                expand:true
            },
            {//lib
                cwd:'.',
                src:[
                    'canvasengine-1.3.2.all.min.js',
                    'buzz.min.js',
                    'jquery-2.1.3.min.js',
                    'jquery.cookie.js',
                    'jquery-ui.min.js'
                ],
                dest:'public/',
                expand:true
            },
            {//levels
                cwd:'.',
                src:'levels/**/*',
                dest:'public/',
                expand:true
            },
            {//css
                cwd:'.',
                src:'*.css',
                dest:'public/',
                expand:true
            },
            {//sound
                cwd:'.',
                src:'sound/**/*',
                dest:'public/',
                expand:true
            },
            {//public html
                cwd:'./publichtml/',
                src:'**/*',
                dest:'public/',
                expand:true
            }
            ]
        }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // and the copy task
  grunt.loadNpmTasks('grunt-contrib-copy');
  // Default task(s).
  grunt.registerTask('default', ['uglify','copy']);

};
