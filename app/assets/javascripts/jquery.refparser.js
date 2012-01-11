/**
 * jQuery Reference Parser
 *
 * jQuery Reference Parser is a jQuery, javascript front-end to a JSON-producing, bibliographic citation parser.
 * 
 * Version 2.1
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
            search   : {
              title : "Search",
              icon  : 'magnifier.png'
            },
            loader   : {
              title : "Loooking for reference...",
              icon  : "ajax-loader.gif"
            },
            error    : {
              title : "Unsuccessful parse",
              icon  : "error.png"
            },
            timeout  : {
              title : "Timeout",
              icon  : "clock_red.png"
            },
            pdf      : {
              title : "PDF",
              icon  : "page_white_acrobat.png"
            },
            html     : {
              title : "HTML",
              icon  : "world_go.png"
            },
            doi      : {
              title : "To publisher...",
              icon  : "world_go.png"
            },
            hdl      : {
              title : "To repository...",
              icon  : "world_go.png"
            },
            scholar  : {
              title : "Search Google Scholar...",
              icon  : "g_scholar.png"
            },
            bhl      : {
              title : "Biodiversity Heritage Library...",
              icon  : "page_white_go.png"
            }
          },

          // JSONP-based web service parser
          parserUrl   : '/citations/',

          // set the target for the final click event (if there is one)
          target      : '',

          // sources
          sources     : ["crossref", "bhl", "biostor"],

          //set a timeout in milliseconds (should be at least 4000)
          timeout     : 5000,

          onSuccessfulParse : function(){},
          onFailedParse     : function(){},
          onError           : function(){}
      },

      settings = $.extend({}, defaults, options),
      target  = settings.target || "";

    base.execute = function(obj, ref) {
      var icon = obj.find('.'+settings.iconClass), identifiers = "", title = "", sources = "";

      $.each(settings.sources, function() {
        sources += "&amp;sources[" + this + "]=true";
      });

      icon.unbind("click").find("img").attr({ src : settings.iconPath+settings.icons.loader.icon, alt : settings.icons.loader.title, title : settings.icons.loader.title });
      $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        url : settings.parserUrl + '?q=' + escape(ref) + sources + '&amp;callback=?',
        timeout : (settings.timeout || 5000),
        success : function(data) {
          identifiers = data.records[0].identifiers || "";
          title = data.records[0].title || "";
          if(!title) {
            icon.click(function() { return false; }).find("img").attr({ src : settings.iconPath+settings.icons.error.icon, alt : settings.icons.error.title, title : settings.icons.error.title });
            settings.onFailedParse.call(this);
          } else {
            if (identifiers.length === 0 && title) {
                icon.attr({ "href" : "http://scholar.google.com/scholar?q="+escape(title), "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.scholar.icon, alt : settings.icons.scholar.title, title : settings.icons.scholar.title });
            } else {
              $.each(identifiers, function(i,v) {
                i = null;
                if(v.type === "doi") {
                  icon.attr({ "href" : "http://dx.doi.org/"+v.id, "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.doi.icon, alt : settings.icons.doi.title, title : settings.icons.doi.title });
                  return false;
                } else if (v.type === "bhl") {
                  icon.attr({ "href" : v.id, "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.bhl.icon, alt : settings.icons.bhl.title, title : settings.icons.bhl.title });
                  return false;
                }
              });
            }
            settings.onSuccessfulParse.call(this, data, obj);
          }
        },
        error : function() {
          icon.click(function() { return false; }).find("img").attr({ src : settings.iconPath+settings.icons.timeout.icon, alt : settings.icons.timeout.title, title : settings.icons.timeout.title });
          settings.onError.call(this);
        }
      });
    };

    return this.each(function() {
      var self = $(this);
      if(self.is(':input[type="text"]')) {
        self.wrap("<div />")
            .live("blur", function() {
              self.parent().find("." + settings.iconClass).remove();
              if(self.val() !== "") {
                self.parent().append('<a href="#" class="'+settings.iconClass+'"><img src="'+settings.iconPath+settings.icons.loader.icon+'" alt="'+settings.icons.loader.title+'" title="'+settings.icons.loader.title+'" /></a>').find('.'+settings.iconClass).click(function() { return false; });
                base.execute(self.parent(), self.val());
              }
            })
            .live("keypress", function(e) {
              var key = e.keyCode || e.which;
              if(key === 13 || key === 9) { e.preventDefault(); this.blur(); }
        });
      } else {
        self.append('<a href="#" class="'+settings.iconClass+'"><img src="'+settings.iconPath+settings.icons.search.icon+'" alt="' + settings.icons.search.title+'" title="'+settings.icons.search.title+'" /></a>');
        self.find('.'+settings.iconClass).css({'border':'0px'}).click(function() {
          base.execute(self, self.text());
          return false;
        });
      }
    });
  };
}(jQuery));