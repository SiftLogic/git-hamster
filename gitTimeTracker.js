var yargs = require('yargs')
    .usage('Tracks time of tasks and inserts those into Project Hamster.\nUsage: $0')
    .example('$0 --startDayMessage --watchCommits=/opt/smuinew', '')
    .describe('startDayMessage', 'set a start of day message taking place now')
    .describe('watchCommits', 'watch the commit log at that location')
    .describe('custom', 'start a custom named task')
    .check(function(argv) {
      return Boolean(
                      argv['startDayMessage'] ||
                      (argv['watchCommits'] && argv['watchCommits'] !== true) ||
                      (argv['custom'] && argv['custom'] !== true)
                    );
    })
    .argv;

var fs = require('fs'),
    exec = require('child_process').exec;
    TimeTrackerFile = require('./timeTrackerFile'),
    HamsterDB = require('./HamsterDB');

var USERNAME = 'jacob',
    TIME_FILE = '/home/'+USERNAME+'/timing/times.csv',
    HAMSTER_DATABASE_FILE = '/home/jacob/.local/share/hamster-applet/hamster.db',// Assuming default Hamster install location
    PROJECT_LOCATION = yargs.watchCommits,
    INTERVAL = 1000;// The log will be checked for changes at this interval in ms

var Utility = function() {
  var self = this || {};

  self.execute = function(command, callback) {
    exec(command, function(err, stdout) { 
      if (err) {throw err;}

      callback(stdout); 
    });
  };

  return self;
};

(function main() {
  var u = new Utility(),
      file = new TimeTrackerFile(TIME_FILE),
      hamsterDB = new HamsterDB(HAMSTER_DATABASE_FILE);

  // Extracts the commit message title (in some cases may be the whole commit) from the commit log string sent in.
  var getMessageName = function(commit) {
    return commit.split('\n\n')[1].split('\n')[0].trim();
  };

  // Extract the commit time from the sent in commit log string sent in.
  var getCommitTime = function(commit) {
    return commit.split('\n')[3].replace('Date:', '').trim();
  };

  // Keeps on checking the git log for new changes, current latest commit is not added.
  var checkGit = function() {
    if (!yargs['watchCommits']){
      return true;
    }

    console.log('\nStarted to watch', PROJECT_LOCATION, 'for commit changes. ('+(INTERVAL/1000)+'s poll)', '\n');

    // Writes the latest unique commits to Hamster's database
    var lastResult = null;
    setInterval(function() {
      u.execute(
        'cd ' + PROJECT_LOCATION + ';' +
        'git log -p -1',
      function(result) {
        if (lastResult !== null && lastResult !== result){
          hamsterDB.insertCustom(getMessageName(result), true, getCommitTime(result));
        } 
        lastResult = result;
      });
    }, INTERVAL);
  };

  var checkCustom = function() {
    if (yargs.custom){
      hamsterDB.insertCustom(yargs.custom, new Date() + '', false, checkGit);
    }

    checkGit();
  };

  hamsterDB.init(checkCustom, Boolean(yargs.startDayMessage));
})();