$(function() {

  var bso = {
        "db" : localStorage["biblioSpotter"] || ""
      };

  bso.activate = function() {
    var self = this;

    $('.submit').click(function(e) {
      e.preventDefault();
      self.save();
    });
  };

  bso.restore = function() {
    var self = this;

    if(!this.db) { return; }

    $.each(self.db, function(index, value) {

    });
  };

  bso.save = function() {
    this.db = $('form').serialize();
  };

  bso.init = function() {
    this.activate();
    this.restore();
  };

  bso.init();

});