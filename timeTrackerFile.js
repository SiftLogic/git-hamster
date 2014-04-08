var fs = require('fs');

/* Provides an interface for all file operations. The file name is sent in */
module.exports = function(FILE_NAME) {
  var self = this || {};
      self.TOP_LINE = 'Timestamp,Action,Elapsed\n';
      self.originalLastLine = null;

  // Gets the first line of the file and returns the contents as the first argument to the callback. If the file does not exist, it is created
  // returning null to the callback.
  self.getLastLine = function(callback) {
    var readLine = function() {
      fs.readFile(FILE_NAME, function(err, data) {
        if (err) throw err;
        self.originalLastLine = (data + '').split('\n').slice(-2)[0];

        callback(self.originalLastLine);
      });
    };

    fs.exists(FILE_NAME, function (exists) {
      if (!exists){
        fs.writeFile(FILE_NAME, self.TOP_LINE, function (err) {
          if (err) throw err;
          
          readLine();
        });
      } else {
        readLine();
      }
    });
  };

  // Writes a line to the file, placing each info comman seperated from the first 3 arguments passed in. They should be:
  // timestamp: of action in full system time e.g. Mon Apr 7 15:34:09 2014 -0400
  // name: of action e.g. Merge pull request #165 from SiftLogic/feature/alistshouldbedeletedbeforetheuserleavestheui
  // elapsed: the time elapsed from the previous action in ms e.g. 4000
  // If the current info is the same as last line, no info is written.
  // 
  // NOTE: Only allows one info content to be written at a time, all others are discarded.
  self.writing = false;
  self.writeToFile = function(timestamp, name, elapsed) {
    if (!self.writing){
      self.writing = true;

      var toWrite = timestamp + ',' + name + ',' + elapsed + '\n';

      if (toWrite.replace(/\n/, '') !== self.originalLastLine){
        fs.appendFile(FILE_NAME, timestamp + ',' + name + ',' + elapsed + '\n', function(err) {
          if(err) throw err;

          self.writing = false;
          console.log('Wrote', toWrite.replace(/\n/, ''), 'to', FILE_NAME);
        });
      }
    }
  };
  
}