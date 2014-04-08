var fs = require('fs'),
    exec = require('child_process').exec;
    TimeTrackerFile = require('./timeTrackerFile'),
    HamsterDB = require('./HamsterDB');

var USERNAME = 'jacob',
    TIME_FILE = '/home/'+USERNAME+'/timing/times.csv',
    HAMSTER_DATABASE_FILE = '/home/jacob/.local/share/hamster-applet/hamster.db',// Assuming default Hamster install location
    PROJECT_LOCATION = '/opt/smuinew',
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
    console.log('\nStarted to watch', PROJECT_LOCATION, 'for commit changes. ('+(INTERVAL/1000)+'s poll)', '\n');

    // Writes the latest unique commits to Hamster's database
    var lastResult = null;
    setInterval(function() {
      u.execute(
        'cd ' + PROJECT_LOCATION + ';' +
        'git log -p -1',
      function(result) {
        if (lastResult !== null && lastResult !== result){
          hamsterDB.insertCommit(getMessageName(result), getCommitTime(result));
        } 
        lastResult = result;
      });
    }, INTERVAL);
  };

  hamsterDB.init(checkGit);
})();