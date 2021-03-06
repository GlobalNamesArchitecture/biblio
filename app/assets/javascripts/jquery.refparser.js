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
/*global $, jQuery, encodeURIComponent, Right */

(function($){

  "use strict";

  $.fn.refparser = function(options) {

    var base     = this,
        defaults = {

          // JSONP-based web service parser
          parserUrl   : 'http://biblio.globalnames.org/parser.json',

          // set the target for the final click event (if there is one)
          target      : '',

          // sources
          sources     : ["crossref", "bhl", "biostor"],

          // input box auto-formatter. Options are "ama", "apa", or "asa"
          style       : 'apa',

          //set a timeout in milliseconds, max 10000 (should be at least 5000)
          timeout     : 10000,

          // URL path to the icons directory & icons themselves
          iconPath  : 'http://biblio.globalnames.org/assets/',
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
            doi      : {
              title : "To publisher...",
              icon  : "world_go.png"
            },
            bhl      : {
              title : "Biodiversity Heritage Library...",
              icon  : "page_white_go.png"
            },
            biostor  : {
              title : "BioStor...",
              icon  : "page_white_go.png"
            },
            scholar  : {
              title : "Search Google Scholar...",
              icon  : "g_scholar.png"
            },
            timeout  : {
              title : "Timeout",
              icon  : "clock_red.png"
            },
            error    : {
              title : "Failed parse or DOI look-up",
              icon  : "error.png"
            }
          },

          /* Callbacks */
          onSuccessfulParse : function(obj, data) { obj=null; data=null; },
          onFailedParse     : function(obj) { obj=null; },
          onError           : function(obj) { obj=null; }
      },

      styles = ["ama", "apa", "asa"],

      settings = $.extend({}, defaults, options);

    base.execute = function(obj, ref) {
      var icon        = obj.find('.'+settings.iconClass),
          identifiers = "",
          title       = "",
          formatted   = "",
          sources     = "",
          target      = settings.target || "",
          timeout     = (settings.timeout <= 10000) ? settings.timeout : 10000,
          style       = ($.inArray(settings.style, styles) > 0) ? settings.style : "apa";

      $.each(settings.sources, function() {
        sources += "&amp;sources["+this+"]=true";
      });

      icon.unbind("click").find("img").attr({ src : settings.iconPath+settings.icons.loader.icon, alt : settings.icons.loader.title, title : settings.icons.loader.title });
      $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        url : settings.parserUrl+'?q='+encodeURIComponent(ref)+sources+'&amp;style='+style+'&amp;callback=?',
        timeout : timeout,
        success : function(data) {
          identifiers = data.records[0].identifiers || "";
          title = data.records[0].title || "";
          formatted = data.records[0].formatted || "";
          if(!title) {
            icon.click(function() { return false; }).find("img").attr({ src : settings.iconPath+settings.icons.error.icon, alt : settings.icons.error.title, title : settings.icons.error.title });
            settings.onFailedParse.call(this, obj);
          } else {
            if (identifiers.length === 0 && title) {
                icon.attr({ "href" : "http://scholar.google.com/scholar?q="+encodeURIComponent(title), "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.scholar.icon, alt : settings.icons.scholar.title, title : settings.icons.scholar.title });
            } else {
              $.each(identifiers, function(i,v) {
                i = null;
                if(v.type === "doi") {
                  icon.attr({ "href" : "http://dx.doi.org/"+v.id, "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.doi.icon, alt : settings.icons.doi.title, title : settings.icons.doi.title });
                  if(ref.match(/10\.(\d)+(\S)+/) && obj.find(":first").is(':input[type="text"]')) {
                    obj.find(":first").val(formatted);
                  }
                } else if (v.type === "bhl") {
                  icon.attr({ "href" : v.id, "target" : target }).find("img").attr({ src : settings.iconPath+settings.icons.bhl.icon, alt : settings.icons.bhl.title, title : settings.icons.bhl.title });
                } else if (v.type === "biostor") {
                  icon.attr({ "href" : v.id, "target" : target}).find("img").attr({ src : settings.iconPath+settings.icons.biostor.icon, alt : settings.icons.biostor.title, title : settings.icons.biostor.title });
                }
                return false;
              });
            }
            settings.onSuccessfulParse.call(this, obj, data);
          }
        },
        error : function() {
          icon.click(function() { return false; }).find("img").attr({ src : settings.iconPath+settings.icons.timeout.icon, alt : settings.icons.timeout.title, title : settings.icons.timeout.title });
          settings.onError.call(this, obj);
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
        self.find('.'+settings.iconClass).click(function() {
          base.execute(self, self.text());
          return false;
        }).end().find("img").css({'border':'0px'});
      }
    });
  };
}(jQuery));