var sqlite3 = require('sqlite3').verbose(),
    _ = require('lodash');

// Manages all connections to the Hamster database. 
module.exports = function(DATABASE_LOCATION) {
  var self = this || {};
  self.db = new sqlite3.Database(DATABASE_LOCATION);

  // Used to track and create the tag for commits.
  self.COMMIT_TAG = {
    name: 'commit',
    id: null
  };

  self.SCHEME = {
    workCategory: 1,

    tables: {
      autoIncrement: 'SQLITE_SEQUENCE',
      task: 'facts',
      taskTagMap: 'fact_tags',
      tag: 'tags',
      activity: 'activities'
    }
  }

  // Gets the next auto increment value for the given table and passes that into the first argument for the callback.
  self.getNextAutoIncrementFor = function(table, callback){
    self.db.all('SELECT * FROM '+self.SCHEME.tables.autoIncrement+' where name="'+table+'"', function(err, data) {
      if (err) {throw err};
      callback(data[0].seq);
    });
  };

  // Returns the time in the format: yyyy-mm-dd hh:mm:ss for hamster.
  self.formatDate = function(date) {
    date = new Date(date);
    var partOfDay = date.toTimeString().split(' ')[0],
        partOfYear = date.toISOString().split('T')[0];

    return partOfYear + ' ' + partOfDay;
  };

  // Creates a new commit tag if necessary. Calls the callback when done. May be async.
  self.init = function(callback) {
    self.db.serialize(function() {
      self.db.all('SELECT * FROM '+self.SCHEME.tables.tag, function(err, data) {
        if (err) {throw err};

        data.forEach(function(tag) {
          if (tag.name === self.COMMIT_TAG.name){
            self.COMMIT_TAG.id = tag.id;
          }
        });

        if (self.COMMIT_TAG.id === null){
          console.log('"' + self.COMMIT_TAG.name + '" tag not found, creating it.');

          self.getNextAutoIncrementFor(self.SCHEME.tables.tag, function(increment) {
            self.COMMIT_TAG.id = increment + 1;
            callback();
          });

          self.db.run('INSERT INTO '+self.SCHEME.tables.tag+'(name,autocomplete) VALUES ("'+self.COMMIT_TAG.name+'","true")');
        } else {
          callback();
        }
      });
    });
  };

  // Inserts an activity given the description if it does not already exist. Calls the callback with the id of the activity.
  self.insertActivity = function(description, callback){
    self.db.all('SELECT * FROM '+self.SCHEME.tables.activity, function(err, data) {
      if (err) {throw err};

      var activityId = null;
      data.forEach(function(tag) {
        if (tag.name === description){
          activityId = tag.id;
        }
      });

      if (activityId === null){
        activityId = _.max(_.pluck(data, 'id')) + 1;
        activityId = (activityId > -1) ? activityId : 0;

        self.db.run('INSERT INTO '+self.SCHEME.tables.activity+'(id,name,category_id,search_name) VALUES (?,?,?,?)', 
          [activityId, description, self.SCHEME.workCategory, description.toLowerCase()],
        function(err) {
          if (err) {throw err};

          callback(activityId);
        });
      } else {
        callback(activityId);
      }
    });
  };

  self.addTagToTask = function(taskId) {
    self.db.run('INSERT INTO '+self.SCHEME.tables.taskTagMap+'(fact_id,tag_id) VALUES (?,?)', [taskId, self.COMMIT_TAG.id]);
  };

  // Inserts a commit fact with the correct timestamps, if it does not already exist. The start time is determined from the previous task.
  self.insertCommit = function(description, end) {
    end = self.formatDate(end);

    self.insertActivity(description, function(activityId) {
      self.db.all('SELECT * FROM '+self.SCHEME.tables.task, function(err, data) {
        if (err) {throw err};

        var id = null,
            start = null;
        data.forEach(function(tag, index) {
          if (tag.activity_id === activityId && tag.end_time == end){
            id = tag.id;
          }

          if (index === data.length - 1){
            start = tag.end_time;
          }
        });

        if (start === null){
          throw('Error: There must be a time defined before a commit is logged.');
        }

        // Has this task already been inserted
        if (id === null){
          id = _.max(_.pluck(data, 'id')) + 1;
          id = (id > -1) ? id : 0;

          console.log('Inserting', description, 'into hamster database.');
          self.db.run('INSERT INTO '+self.SCHEME.tables.task+'(id,activity_id,start_time,end_time) VALUES (?,?,?,?)', 
            [id, activityId, start, end], function() {
              self.addTagToTask(id);
          });
        }
      });
    });
  };

  // Closes the database.
  self.exit = function() {
    self.db.close();
  };

  return self;
};