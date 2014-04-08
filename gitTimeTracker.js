var fs = require('fs'),
    exec = require('child_process').exec;
    TimeTrackerFile = require('./timeTrackerFile');

var TIME_FILE = '/home/jacob/timing/times.csv',
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

// Tracks the currentTime. Constructor is passed a callback getLastLine:
// getLastLine: callback  that returns the last line as the first argument of a callback passed to it.
var Times = function(getLastLine) {
  var self = this || {};

  self.lastTime = null;
  
  // Calculates the time from the last time using the current. Calls the sent in callback with the results in ms as the first argument.
  // Note: May or may not be async, it is best to just assume it is.
  self.elapsed = function(current, callback) {
    var calculateAndReturn = function() {
      var toReturn = new Date(current) - new Date(self.lastTime);
      if (toReturn + '' == 'NaN'){
        toReturn = 0;
      }

      self.lastTime = current;
      callback(toReturn);
    };

    if (!self.lastTime){
      getLastLine(function(lastLine) {
        self.lastTime = new Date(lastLine.split(',')[0]);

        calculateAndReturn();
      });
    } else {
      calculateAndReturn();
    }
  };
};

(function main() {
  var u = new Utility(),
      file = new TimeTrackerFile(TIME_FILE),
      times = new Times(file.getLastLine);

  var getMessageName = function(commit) {
    return commit.split('\n\n')[1].split('\n')[0].trim();
  };

  var getCommitTime = function(commit) {
    return commit.split('\n')[3].replace('Date:', '').trim();
  };

  console.log('Started to watch', PROJECT_LOCATION, 'for commit changes. ('+(INTERVAL/1000)+'s poll)', '\n');

  // Checks if the timings should be updated every INTERVAL ms if the latest commit is different.
  var prevResult = null;
  setInterval(function() {
    u.execute(
      'cd ' + PROJECT_LOCATION + ';' +
      'git log -p -1',
    function(result) {
      if (result !== prevResult){
        times.elapsed(getCommitTime(result), function(elapsed) {
          file.writeToFile(getCommitTime(result), getMessageName(result), elapsed);
        });
      }

      prevResult = result;
    });
  }, INTERVAL);

  
})();