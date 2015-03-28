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
            'public/build/apiClient.js': 'src/apiClient.js',
            'public/build/apiuser.js': 'src/apiuser.js',
            'public/build/backtrack.js': 'src/backtrack.js',
            'public/build/designer/designer.js':'src/designer/designer.js',
            'public/build/maze.js': 'src/maze.js',
            'public/build/mazeMenu.js': 'src/mazeMenu.js',
            'public/build/mazeModel.js': 'src/mazeModel.js',
            'public/build/mazeRender.js': 'src/mazeRender.js',
            'public/build/remoteDB.js': 'src/remoteDB.js',
            'public/build/trailModel.js': 'src/trailModel.js'
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
                src:'lib/**/*',
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
