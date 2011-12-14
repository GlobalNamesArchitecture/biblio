/**
 * jQuery Reference Parser
 *
 * jQuery Reference Parser is a jQuery, javascript front-end to a JSON-producing, bibliographic citation parser.
 * 
 * Version 2.0
 * November 14, 2010
 *
 * Copyright (c) 2010 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, escape, Right */

(function($){

  "use strict";

  $.fn.refParser = function(options) {

    var base     = this,
        defaults = {

          // URL path to the icons directory & icons themselves
          iconPath  : '/icons/',
          iconClass : 'refparser-icon',
          icons     : {
            search   : 'magnifier.png',
            loader   : 'ajax-loader.gif',
            error    : 'error.png',
            timeout  : 'clock_red.png',
            pdf      : 'page_white_acrobat.png',
            html     : 'world_go.png',
            doi      : 'world_go.png',
            hdl      : 'world_go.png',
            scholar  : 'g_scholar.png',
            bhl      : 'page_white_go.png'
          },

          // web service parser
          parserUrl   : '/citations/',
          callback    : 'myCallback',

          // set the target for the final click event (if there is one)
          target      : '',

          //set a timeout in milliseconds (should be at least 4000)
          timeout     : 5000,

          onSuccessfulParse : function(){},
          onFailedParse     : function(){},
          onError           : function(){}
      },

      settings = $.extend({}, defaults, options),
      target  = (settings.target) ? " target=\""+settings.target+"\" " : "";

    base.execute = function(obj) {
      var icon = obj.find('.' + settings.iconClass), identifiers = "", title = "", link = "";

      icon.attr({src : settings.iconPath + settings.icons.loader, alt : 'Looking for reference...', title : 'Looking for reference...'}).css({'cursor':'auto'}).unbind('click');
      $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        url : settings.parserUrl + '?q=' + escape(obj.text()) + '&callback=?',
        timeout : (settings.timeout || 5000),
        success : function(data) {
          identifiers = data.records[0].identifiers || "";
          title = data.records[0].title || "";
          if(!title) {
            icon.attr({src : settings.iconPath + settings.icons.error, alt : 'Unsuccessful parse', title : 'Unsuccessful parse'}).css('cursor', 'auto').unbind('click');
            settings.onFailedParse.call(this);
          } else {
            if (identifiers.length === 0 && title) {
                icon.attr({src : settings.iconPath + settings.icons.scholar, alt : 'Search Google Scholar', title : 'Search Google Scholar'})
                    .css({'cursor':'pointer'})
                    .unbind('click')
                    .wrap("<a href=\"http://scholar.google.com/scholar?q="+escape(title)+"\"" + target + " />");
            } else {
              $.each(identifiers, function(i,v) {
                i = null;
                if(v.type === "doi") {
                  link = "http://dx.doi.org/"+v.id;
                  icon.attr({src : settings.iconPath + settings.icons.doi, alt : 'To publisher...', title : 'To publisher...'})
                      .css({'cursor':'pointer'})
                      .unbind('click')
                      .wrap("<a href=\"" + link + "\"" + target + " />");
                  return false;
                } else if (v.type === "bhl") {
                  link = v.id;
                  icon.attr({src : settings.iconPath + settings.icons.bhl, alt : 'To BHL...', title : 'To BHL...'})
                      .css({'cursor':'pointer'})
                      .unbind('click')
                      .wrap("<a href=\"" + v.id + "\"" + target + " />");
                  return false;
                }
              });
            }
            settings.onSuccessfulParse.call(this, data, obj);
          }
        },
        error : function() {
          icon.attr({src : settings.iconPath + settings.icons.timeout, alt : 'Query timedout. Please try later', title : 'Query timedout. Please try later'}).css('cursor', 'auto').unbind('click');
          settings.onError.call(this);
        }
      });
    };

    return this.each(function() {
      var self = $(this);
      self.append('<img src="' + settings.iconPath + settings.icons.search + '" alt="Search!" title="Search!" class="' + settings.iconClass + '" />');
      self.find('.' + settings.iconClass).css({'cursor':'pointer','border':'0px'}).click(function() {
        base.execute(self);
      });
    });
  };
}(jQuery));